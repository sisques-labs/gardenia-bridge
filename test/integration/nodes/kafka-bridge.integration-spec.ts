import { Kafka } from 'kafkajs';
import { KafkaContainer, StartedKafkaContainer } from '@testcontainers/kafka';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';

import { ForwardCommandToNodeHandler } from '../../../src/contexts/nodes/application/commands/forward-command-to-node/forward-command-to-node.handler';
import { BridgeMessageTypeEnum } from '../../../src/contexts/nodes/domain/enums/bridge-message-type.enum';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '../../../src/contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeCommandsConsumerService } from '../../../src/contexts/nodes/infrastructure/kafka/kafka-bridge-commands-consumer.service';
import { KafkaBridgeProducerService } from '../../../src/contexts/nodes/infrastructure/kafka/kafka-bridge-producer.service';
import { MqttCommandPublisherService } from '../../../src/contexts/nodes/infrastructure/mqtt/mqtt-command-publisher.service';

/**
 * Real Kafka round-trip via testcontainers, mirroring the
 * @testcontainers/postgresql pattern already used for Postgres integration
 * tests in this repo. Requires a reachable Docker daemon.
 *
 * NOT executed in the environment this change was authored in — that
 * sandbox has no reachable Docker daemon (`docker run hello-world` fails
 * with "no such file or directory" on /var/run/docker.sock), so
 * testcontainers cannot select a container runtime strategy. The suite
 * self-skips when no Docker daemon is reachable (see beforeAll below) so it
 * degrades gracefully instead of hanging; run it anywhere Docker is
 * available to get real coverage.
 */
describe('Kafka bridge — testcontainers integration', () => {
  let container: StartedKafkaContainer | null = null;
  let moduleRef: TestingModule | null = null;
  let kafka: Kafka;
  let fakePublisher: { publish: jest.Mock };
  let auditEntries: unknown[];
  let dockerAvailable = true;

  beforeAll(async () => {
    try {
      container = await new KafkaContainer('confluentinc/cp-kafka:7.6.0')
        .withExposedPorts(9093)
        .start();
    } catch {
      dockerAvailable = false;
      return;
    }

    const brokers = [`${container.getHost()}:${container.getMappedPort(9093)}`];

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
      record: jest.fn(async (entry) => {
        auditEntries.push(entry);
      }),
    };
    fakePublisher = {
      publish: jest.fn().mockResolvedValue('nodes/node-1/commands'),
    };

    moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true }), CqrsModule.forRoot()],
      providers: [
        KafkaBridgeProducerService,
        KafkaBridgeCommandsConsumerService,
        ForwardCommandToNodeHandler,
        { provide: MqttCommandPublisherService, useValue: fakePublisher },
        {
          provide: BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
          useValue: fakeAuditRepository,
        },
      ],
    }).compile();

    await moduleRef.init();
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, 120_000);

  afterAll(async () => {
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

    const envelope = {
      type: BridgeMessageTypeEnum.TELEMETRY,
      nodeId: 'node-1',
      timestamp: new Date().toISOString(),
      sensorType: 'soil-moisture',
      value: 42.5,
    } as const;

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

    expect(JSON.parse(received)).toMatchObject({ nodeId: 'node-1' });
  }, 30_000);

  it('relays a command from Kafka to the MQTT publisher', async () => {
    if (!dockerAvailable) {
      return;
    }

    const producer = kafka.producer();
    await producer.connect();

    const envelope = {
      type: BridgeMessageTypeEnum.COMMAND,
      nodeId: 'node-2',
      timestamp: new Date().toISOString(),
      commandId: 'cmd-1',
      action: 'open-valve',
    };
    await producer.send({
      topic: 'bridge-it.commands',
      messages: [{ key: 'node-2', value: JSON.stringify(envelope) }],
    });
    await producer.disconnect();

    await waitFor(() => fakePublisher.publish.mock.calls.length > 0);

    expect(fakePublisher.publish).toHaveBeenCalledWith(
      'node-2',
      expect.objectContaining({ commandId: 'cmd-1', action: 'open-valve' }),
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
