import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { UuidValueObject } from '@sisques-labs/nestjs-kit';

import { ForwardNodeEventToKafkaCommand } from '@contexts/nodes/application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.command';
import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import {
  extractNodeIdFromTopic,
  parseNodeEventPayload,
} from '@contexts/nodes/infrastructure/validation/parse-node-event-payload';
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
    private readonly eventBus: EventBus,
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
    private readonly bridgeMessageLogBuilder: BridgeMessageLogBuilder,
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

      try {
        // nodeId comes straight from the topic regex (not domain-validated)
        // — a malformed/unrecognized topic can yield a non-UUID string, so
        // building the audit entry itself gets its own safety net; a broken
        // audit write must never crash the listener.
        const now = new Date();
        const aggregate = this.bridgeMessageLogBuilder
          .withId(UuidValueObject.generate().value)
          .withCreatedAt(now)
          .withUpdatedAt(now)
          .withDirection(BridgeMessageDirectionEnum.INBOUND)
          .withType(BridgeMessageTypeEnum.UNKNOWN)
          .withNodeId(nodeId)
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
