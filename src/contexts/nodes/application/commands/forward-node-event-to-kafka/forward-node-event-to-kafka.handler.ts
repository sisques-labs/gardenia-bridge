import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { BaseCommandHandler, UuidValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageLogAggregate } from '@contexts/nodes/domain/aggregates/bridge-message-log.aggregate';
import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeProducerService } from '@contexts/nodes/infrastructure/kafka/kafka-bridge-producer.service';
import { ForwardNodeEventToKafkaCommand } from './forward-node-event-to-kafka.command';

@CommandHandler(ForwardNodeEventToKafkaCommand)
export class ForwardNodeEventToKafkaHandler
  extends BaseCommandHandler<
    ForwardNodeEventToKafkaCommand,
    BridgeMessageLogAggregate
  >
  implements ICommandHandler<ForwardNodeEventToKafkaCommand, void>
{
  private readonly logger = new Logger(ForwardNodeEventToKafkaHandler.name);

  constructor(
    private readonly kafkaBridgeProducer: KafkaBridgeProducerService,
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
    private readonly bridgeMessageLogBuilder: BridgeMessageLogBuilder,
    eventBus: EventBus,
  ) {
    super(eventBus);
  }

  async execute(command: ForwardNodeEventToKafkaCommand): Promise<void> {
    const { sourceTopic, rawPayload, envelope } = command;

    try {
      const destinationTopic = await this.kafkaBridgeProducer.send(envelope);
      const now = new Date();

      // The whole chain runs synchronously (no `await` in between `withId()`
      // and `build()`) so that sharing `bridgeMessageLogBuilder` — a DI
      // singleton — across concurrent `execute()` calls (the MQTT listener
      // dispatches fire-and-forget) can never interleave two in-flight
      // builds.
      const aggregate = this.bridgeMessageLogBuilder
        .withId(UuidValueObject.generate().value)
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .withDirection(BridgeMessageDirectionEnum.INBOUND)
        .withType(envelope.type.value)
        .withNodeId(envelope.nodeId.value)
        .withSourceTopic(sourceTopic.value)
        .withRawPayload(rawPayload.value)
        .withProcessedAt(now.toISOString())
        .withDestinationTopic(destinationTopic)
        .withOutcome(BridgeMessageOutcomeEnum.SUCCESS)
        .build();
      aggregate.record();

      await this.bridgeMessageLogWriteRepository.save(aggregate);
      await this.publishEvents(aggregate);

      this.logger.log(
        `Forwarded ${envelope.type.value} for node ${envelope.nodeId.value} from ${sourceTopic.value} to ${destinationTopic}`,
      );
    } catch (error) {
      const errorReason =
        error instanceof Error ? error.message : String(error);
      const now = new Date();

      const aggregate = this.bridgeMessageLogBuilder
        .withId(UuidValueObject.generate().value)
        .withCreatedAt(now)
        .withUpdatedAt(now)
        .withDirection(BridgeMessageDirectionEnum.INBOUND)
        .withType(envelope.type.value)
        .withNodeId(envelope.nodeId.value)
        .withSourceTopic(sourceTopic.value)
        .withRawPayload(rawPayload.value)
        .withProcessedAt(now.toISOString())
        .withDestinationTopic(null)
        .withOutcome(BridgeMessageOutcomeEnum.ERROR)
        .withErrorReason(errorReason)
        .build();
      aggregate.record();

      await this.bridgeMessageLogWriteRepository.save(aggregate);
      await this.publishEvents(aggregate);

      this.logger.error(
        `Failed to forward ${envelope.type.value} for node ${envelope.nodeId.value} from ${sourceTopic.value}: ${errorReason}`,
      );
    }
  }
}
