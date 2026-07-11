import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Consumer, Kafka, SASLOptions } from 'kafkajs';

import { IBridgeKafkaConfig } from '@core/config/kafka.config';

import { ForwardCommandToNodeCommand } from '@contexts/nodes/application/commands/forward-command-to-node/forward-command-to-node.command';
import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { parseCommandPayload } from '@contexts/nodes/infrastructure/validation/parse-command-payload';

@Injectable()
export class KafkaBridgeCommandsConsumerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaBridgeCommandsConsumerService.name);
  private consumer: Consumer | null = null;
  private config: IBridgeKafkaConfig | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly commandBus: CommandBus,
    private readonly eventBus: EventBus,
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
    private readonly bridgeMessageLogBuilder: BridgeMessageLogBuilder,
  ) {}

  async onModuleInit(): Promise<void> {
    this.config = this.configService.getOrThrow<IBridgeKafkaConfig>('kafka');
    const config = this.config;

    if (!config.enabled) {
      this.logger.warn(
        'KAFKA_ENABLED=false — bridge Kafka commands consumer will not connect',
      );
      return;
    }

    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      ssl: config.ssl,
      sasl: (config.sasl as SASLOptions | undefined) ?? undefined,
    });

    this.consumer = kafka.consumer({
      groupId: `${config.clientId}-bridge-commands`,
    });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: config.bridgeCommandsTopic,
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, message }) => {
        await this.handleMessage(topic, message.value?.toString() ?? '');
      },
    });

    this.logger.log(
      `Bridge Kafka commands consumer subscribed to "${config.bridgeCommandsTopic}"`,
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.consumer?.disconnect();
  }

  isConnected(): boolean {
    return !this.config?.enabled || this.consumer !== null;
  }

  private async handleMessage(
    topic: string,
    rawPayload: string,
  ): Promise<void> {
    this.logger.log(`Received Kafka message on "${topic}"`);

    try {
      const envelope = parseCommandPayload(topic, rawPayload);
      await this.commandBus.execute(
        new ForwardCommandToNodeCommand({
          sourceTopic: topic,
          rawPayload,
          envelope,
        }),
      );
    } catch (error) {
      const errorReason =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `Discarding invalid message on "${topic}": ${errorReason}`,
      );

      try {
        const now = new Date();
        const aggregate = this.bridgeMessageLogBuilder
          .withId(UuidValueObject.generate().value)
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .withDirection(BridgeMessageDirectionEnum.OUTBOUND)
          .withType(BridgeMessageTypeEnum.UNKNOWN)
          .withNodeId(null)
          .withSourceTopic(topic)
          .withDestinationTopic(null)
          .withRawPayload(rawPayload)
          .withOutcome(BridgeMessageOutcomeEnum.ERROR)
          .withErrorReason(errorReason)
          .withProcessedAt(now.toISOString())
          .build();
        aggregate.record();

        await this.bridgeMessageLogWriteRepository.save(aggregate);
        await this.eventBus.publishAll(aggregate.getUncommittedEvents());
        await aggregate.commit();
      } catch (auditError) {
        const auditErrorReason =
          auditError instanceof Error ? auditError.message : String(auditError);
        this.logger.error(
          `Failed to record audit entry for invalid message on "${topic}": ${auditErrorReason}`,
        );
      }
    }
  }
}
