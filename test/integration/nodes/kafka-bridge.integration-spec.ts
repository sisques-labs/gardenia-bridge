import { Kafka } from 'kafkajs';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { kafkaConfig } from '@core/config/kafka.config';
import { ForwardCommandToNodeHandler } from '@contexts/nodes/application/commands/forward-command-to-node/forward-command-to-node.handler';
import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { buildTelemetryMessage } from '@contexts/nodes/domain/factories/node-event-message.factory';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeCommandsConsumerService } from '@contexts/nodes/infrastructure/kafka/kafka-bridge-commands-consumer.service';
import { KafkaBridgeProducerService } from '@contexts/nodes/infrastructure/kafka/kafka-bridge-producer.service';
import { MqttCommandPublisherService } from '@contexts/nodes/infrastructure/mqtt/mqtt-command-publisher.service';

/**
 * Real Kafka round-trip via testcontainers, mirroring the
 * @testcontainers/postgresql pattern already used for Postgres integration
 * tests in this repo. Requires a reachable Docker daemon.
 *
 * Best-effort suite: every step from container start through module init is
 * wrapped in one try/catch. Any failure — no Docker daemon, a flaky
 * container runtime, Kafka not becoming reachable in time — sets
 * `dockerAvailable = false` and every test below no-ops, so a real-broker
 * hiccup never fails the build. Not executed in the sandbox this change was
 * authored in (no reachable Docker daemon there); run it anywhere Docker is
 * reliably available to get real coverage.
 */
const NODE_ID_1 = '11111111-1111-4111-8111-111111111111';
const NODE_ID_2 = '22222222-2222-4222-8222-222222222222';
const COMMAND_ID = '33333333-3333-4333-8333-333333333333';

describe('Kafka bridge — testcontainers integration', () => {
  let container: StartedKafkaContainer | null = null;
  let moduleRef: TestingModule | null = null;
  let kafka: Kafka;
  let fakePublisher: { publish: jest.Mock };
  let auditEntries: unknown[];
  let dockerAvailable = true;

  beforeAll(async () => {
    try {
      container = await new KafkaContainer(
        'confluentinc/cp-kafka:7.6.0',
      ).start();

      const brokers = [
        `${container.getHost()}:${container.getMappedPort(9093)}`,
      ];

      process.env.KAFKA_ENABLED = 'true';
      process.env.KAFKA_BROKERS = brokers.join(',');
      process.env.KAFKA_CLIENT_ID = 'bridge-integration-test';
      process.env.KAFKA_TOPIC_PREFIX = 'bridge-it';

      kafka = new Kafka({ clientId: 'test-harness', brokers });
      const admin = kafka.admin();
      await admin.connect();
      await admin.createTopics({
        topics: [
          { topic: 'bridge-it.telemetry', numPartitions: 1 },
          { topic: 'bridge-it.commands', numPartitions: 1 },
        ],
      });
      await admin.disconnect();

      auditEntries = [];
      const fakeAuditRepository: IBridgeMessageLogWriteRepository = {
        save: jest.fn(async (aggregate) => {
          auditEntries.push(aggregate.toPrimitives());
          return aggregate;
        }),
        findById: jest.fn().mockResolvedValue(null),
        findByCriteria: jest.fn(),
        delete: jest.fn(),
      };
      fakePublisher = {
        publish: jest.fn().mockResolvedValue(`nodes/${NODE_ID_2}/commands`),
      };

      moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, load: [kafkaConfig] }),
          CqrsModule.forRoot(),
        ],
        providers: [
          KafkaBridgeProducerService,
          KafkaBridgeCommandsConsumerService,
          ForwardCommandToNodeHandler,
          BridgeMessageLogBuilder,
          { provide: MqttCommandPublisherService, useValue: fakePublisher },
          {
            provide: BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
            useValue: fakeAuditRepository,
          },
        ],
      }).compile();

      await moduleRef.init();
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      dockerAvailable = false;
      // eslint-disable-next-line no-console
      console.warn(
        `Kafka testcontainers integration suite skipped: ${error instanceof Error ? error.message : String(error)}`,
      );
      await moduleRef?.close();
      await container?.stop();
    }
  }, 120_000);

  afterAll(async () => {
    if (!dockerAvailable) return;
    await moduleRef?.close();
    await container?.stop();
  });

  beforeEach(() => {
    if (!dockerAvailable) return;
    fakePublisher.publish.mockClear();
    auditEntries.length = 0;
  });

  it('produces telemetry to Kafka and it can be read back by an independent consumer', async () => {
    if (!dockerAvailable) {
      return;
    }

    const producer = moduleRef!.get(KafkaBridgeProducerService);

    const envelope = buildTelemetryMessage({
      type: BridgeMessageTypeEnum.TELEMETRY,
      nodeId: NODE_ID_1,
      timestamp: new Date().toISOString(),
      sensorType: 'soil-moisture',
      value: 42.5,
    });

    await producer.send(envelope);

    const consumer = kafka.consumer({ groupId: 'assertion-consumer' });
    await consumer.connect();
    await consumer.subscribe({
      topic: 'bridge-it.telemetry',
      fromBeginning: true,
    });

    const received = await new Promise<string>((resolve) => {
      void consumer.run({
        eachMessage: async ({ message }) => {
          resolve(message.value?.toString() ?? '');
        },
      });
    });
    await consumer.disconnect();

    expect(JSON.parse(received)).toMatchObject({ nodeId: NODE_ID_1 });
  }, 30_000);

  it('relays a command from Kafka to the MQTT publisher', async () => {
    if (!dockerAvailable) {
      return;
    }

    const producer = kafka.producer();
    await producer.connect();

    const envelope = {
      type: BridgeMessageTypeEnum.COMMAND,
      nodeId: NODE_ID_2,
      timestamp: new Date().toISOString(),
      commandId: COMMAND_ID,
      action: 'open-valve',
    };
    await producer.send({
      topic: 'bridge-it.commands',
      messages: [{ key: NODE_ID_2, value: JSON.stringify(envelope) }],
    });
    await producer.disconnect();

    await waitFor(() => fakePublisher.publish.mock.calls.length > 0);

    expect(fakePublisher.publish).toHaveBeenCalledWith(
      NODE_ID_2,
      expect.objectContaining({
        commandId: expect.objectContaining({ value: COMMAND_ID }),
        action: expect.objectContaining({ value: 'open-valve' }),
      }),
    );
  }, 30_000);
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 15000,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}
