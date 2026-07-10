import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '../../../domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeProducerService } from '../../../infrastructure/kafka/kafka-bridge-producer.service';
import { ForwardNodeEventToKafkaCommand } from './forward-node-event-to-kafka.command';

@CommandHandler(ForwardNodeEventToKafkaCommand)
export class ForwardNodeEventToKafkaHandler implements ICommandHandler<
  ForwardNodeEventToKafkaCommand,
  void
> {
  private readonly logger = new Logger(ForwardNodeEventToKafkaHandler.name);

  constructor(
    private readonly kafkaBridgeProducer: KafkaBridgeProducerService,
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
  ) {}

  async execute(command: ForwardNodeEventToKafkaCommand): Promise<void> {
    const { sourceTopic, rawPayload, envelope } = command;

    try {
      const destinationTopic = await this.kafkaBridgeProducer.send(envelope);

      await this.bridgeMessageLogWriteRepository.record({
        direction: 'inbound',
        type: envelope.type,
        nodeId: envelope.nodeId,
        sourceTopic,
        destinationTopic,
        rawPayload,
        outcome: 'success',
        errorReason: null,
        processedAt: new Date().toISOString(),
      });

      this.logger.log(
        `Forwarded ${envelope.type} for node ${envelope.nodeId} from ${sourceTopic} to ${destinationTopic}`,
      );
    } catch (error) {
      const errorReason =
        error instanceof Error ? error.message : String(error);

      await this.bridgeMessageLogWriteRepository.record({
        direction: 'inbound',
        type: envelope.type,
        nodeId: envelope.nodeId,
        sourceTopic,
        destinationTopic: null,
        rawPayload,
        outcome: 'error',
        errorReason,
        processedAt: new Date().toISOString(),
      });

      this.logger.error(
        `Failed to forward ${envelope.type} for node ${envelope.nodeId} from ${sourceTopic}: ${errorReason}`,
      );
    }
  }
}
