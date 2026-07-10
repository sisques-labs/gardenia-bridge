import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Consumer, Kafka, SASLOptions } from 'kafkajs';

import { IBridgeKafkaConfig } from '@core/config/kafka.config';

import { ForwardCommandToNodeCommand } from '../../application/commands/forward-command-to-node/forward-command-to-node.command';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '../../domain/repositories/write/bridge-message-log-write.repository';
import { parseCommandPayload } from '../validation/parse-command-payload';

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
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
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

      await this.bridgeMessageLogWriteRepository.record({
        direction: 'outbound',
        type: 'unknown',
        nodeId: null,
        sourceTopic: topic,
        destinationTopic: null,
        rawPayload,
        outcome: 'error',
        errorReason,
        processedAt: new Date().toISOString(),
      });
    }
  }
}
