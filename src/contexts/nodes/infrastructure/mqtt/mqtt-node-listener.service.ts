import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { ForwardNodeEventToKafkaCommand } from '../../application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.command';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '../../domain/repositories/write/bridge-message-log-write.repository';
import {
  extractNodeIdFromTopic,
  parseNodeEventPayload,
} from '../validation/parse-node-event-payload';
import { MqttClientProvider } from './mqtt-client.provider';

const SUBSCRIBED_TOPICS = [
  'sensors/+/+/telemetry',
  'nodes/+/heartbeat',
  'nodes/+/commands/ack',
];

@Injectable()
export class MqttNodeListenerService implements OnModuleInit {
  private readonly logger = new Logger(MqttNodeListenerService.name);

  constructor(
    private readonly mqttClientProvider: MqttClientProvider,
    private readonly commandBus: CommandBus,
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
  ) {}

  onModuleInit(): void {
    const client = this.mqttClientProvider.getClient();

    client.on('connect', () => {
      client.subscribe(SUBSCRIBED_TOPICS, (error) => {
        if (error) {
          this.logger.error(
            `Failed to subscribe to node event topics: ${error.message}`,
          );
          return;
        }
        this.logger.log(
          `Subscribed to node event topics: ${SUBSCRIBED_TOPICS.join(', ')}`,
        );
      });
    });

    client.on('message', (topic, payload) => {
      void this.handleMessage(topic, payload.toString());
    });
  }

  private async handleMessage(
    topic: string,
    rawPayload: string,
  ): Promise<void> {
    const nodeId = extractNodeIdFromTopic(topic);
    this.logger.log(`Received MQTT message on "${topic}" (node ${nodeId})`);

    try {
      const envelope = parseNodeEventPayload(topic, rawPayload);
      await this.commandBus.execute(
        new ForwardNodeEventToKafkaCommand({
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
        direction: 'inbound',
        type: 'unknown',
        nodeId,
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
