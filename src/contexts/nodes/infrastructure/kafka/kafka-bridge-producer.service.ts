import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, SASLOptions } from 'kafkajs';

import { IBridgeKafkaConfig } from '@core/config/kafka.config';

import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { nodeEventMessageToPrimitives } from '@contexts/nodes/domain/factories/node-event-message.factory';
import { NodeEventMessage } from '@contexts/nodes/domain/types/node-event-message.type';

@Injectable()
export class KafkaBridgeProducerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(KafkaBridgeProducerService.name);
  private producer: Producer | null = null;
  private config: IBridgeKafkaConfig | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.config = this.configService.getOrThrow<IBridgeKafkaConfig>('kafka');

    if (!this.config.enabled) {
      this.logger.warn(
        'KAFKA_ENABLED=false — bridge Kafka producer will not connect',
      );
      return;
    }

    const kafka = new Kafka({
      clientId: this.config.clientId,
      brokers: this.config.brokers,
      ssl: this.config.ssl,
      sasl: (this.config.sasl as SASLOptions | undefined) ?? undefined,
    });

    this.producer = kafka.producer();
    await this.producer.connect();
    this.logger.log('Bridge Kafka producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer?.disconnect();
  }

  isConnected(): boolean {
    return !this.config?.enabled || this.producer !== null;
  }

  private resolveTopic(type: BridgeMessageTypeEnum): string {
    if (!this.config) {
      throw new Error(
        'KafkaBridgeProducerService used before onModuleInit ran',
      );
    }
    switch (type) {
      case BridgeMessageTypeEnum.TELEMETRY:
        return this.config.bridgeTelemetryTopic;
      case BridgeMessageTypeEnum.HEARTBEAT:
        return this.config.bridgeHeartbeatTopic;
      case BridgeMessageTypeEnum.COMMAND_ACK:
        return this.config.bridgeCommandAcksTopic;
      default:
        throw new Error(
          `No bridge topic configured for message type "${type}"`,
        );
    }
  }

  async send(envelope: NodeEventMessage): Promise<string> {
    const type = envelope.type.value as BridgeMessageTypeEnum;
    const topic = this.resolveTopic(type);

    if (!this.producer) {
      throw new Error(
        `Kafka producer not connected (KAFKA_ENABLED=false) — cannot send to "${topic}"`,
      );
    }

    await this.producer.send({
      topic,
      messages: [
        {
          key: envelope.nodeId.value,
          value: JSON.stringify(nodeEventMessageToPrimitives(envelope)),
        },
      ],
    });

    return topic;
  }
}
