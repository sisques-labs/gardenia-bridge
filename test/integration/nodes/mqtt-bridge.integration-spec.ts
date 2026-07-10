import { AddressInfo, createServer, Server } from 'net';

import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { Test, TestingModule } from '@nestjs/testing';
import { connect, MqttClient } from 'mqtt';

import { mqttConfig } from '../../../src/core/config/mqtt.config';
import { ForwardNodeEventToKafkaHandler } from '../../../src/contexts/nodes/application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.handler';
import { BridgeMessageTypeEnum } from '../../../src/contexts/nodes/domain/enums/bridge-message-type.enum';
import { NodeEventMessage } from '../../../src/contexts/nodes/domain/interfaces/node-event-message.type';
import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '../../../src/contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeProducerService } from '../../../src/contexts/nodes/infrastructure/kafka/kafka-bridge-producer.service';
import { MqttClientProvider } from '../../../src/contexts/nodes/infrastructure/mqtt/mqtt-client.provider';
import { MqttCommandPublisherService } from '../../../src/contexts/nodes/infrastructure/mqtt/mqtt-command-publisher.service';
import { MqttNodeListenerService } from '../../../src/contexts/nodes/infrastructure/mqtt/mqtt-node-listener.service';

// aedes 0.x ships no useful TS types beyond a plain factory function.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const aedes: () => AedesBroker = require('aedes');

interface AedesBroker {
  handle: (duplex: unknown) => void;
  close: (callback?: () => void) => void;
}

/**
 * Real MQTT round-trip against an embedded aedes broker. No Kafka broker is
 * available in this sandbox (no reachable Docker daemon — see the note in
 * openspec/changes/kafka-mqtt-bridge/tasks.md), so the Kafka producer side
 * is a recording fake; everything else (MQTT wire protocol, topic
 * subscription, Zod validation, real CqrsModule dispatch) is real.
 */
describe('MQTT bridge — aedes integration', () => {
  let broker: AedesBroker;
  let server: Server;
  let brokerUrl: string;
  let moduleRef: TestingModule;
  let testClient: MqttClient;
  let fakeProducer: { send: jest.Mock };
  let auditEntries: unknown[];

  beforeAll(async () => {
    broker = aedes();
    server = createServer(broker.handle);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    brokerUrl = `mqtt://localhost:${port}`;

    process.env.MQTT_URL = brokerUrl;
    process.env.MQTT_CLIENT_ID = 'bridge-integration-test';

    auditEntries = [];
    const fakeAuditRepository: IBridgeMessageLogWriteRepository = {
      record: jest.fn(async (entry) => {
        auditEntries.push(entry);
      }),
    };

    fakeProducer = { send: jest.fn().mockResolvedValue('fake-topic') };

    moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [mqttConfig] }),
        CqrsModule.forRoot(),
      ],
      providers: [
        MqttClientProvider,
        MqttNodeListenerService,
        MqttCommandPublisherService,
        ForwardNodeEventToKafkaHandler,
        { provide: KafkaBridgeProducerService, useValue: fakeProducer },
        {
          provide: BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
          useValue: fakeAuditRepository,
        },
      ],
    }).compile();

    await moduleRef.init();

    testClient = connect(brokerUrl, { clientId: 'test-publisher' });
    await new Promise<void>((resolve) =>
      testClient.on('connect', () => resolve()),
    );

    // Give the bridge's own MQTT client a moment to connect + subscribe.
    await new Promise((resolve) => setTimeout(resolve, 300));
  });

  afterAll(async () => {
    testClient?.end(true);
    await moduleRef?.close();
    await new Promise<void>(
      (resolve) => server?.close(() => resolve()) ?? resolve(),
    );
    broker?.close();
  });

  beforeEach(() => {
    fakeProducer.send.mockClear();
    auditEntries.length = 0;
  });

  it('relays a valid telemetry message from MQTT to the Kafka producer', async () => {
    const envelope: NodeEventMessage = {
      type: BridgeMessageTypeEnum.TELEMETRY,
      nodeId: 'node-1',
      timestamp: new Date().toISOString(),
      sensorType: 'soil-moisture',
      value: 42.5,
    };

    testClient.publish(
      'sensors/node-1/soil-moisture/telemetry',
      JSON.stringify(envelope),
    );

    await waitFor(() => fakeProducer.send.mock.calls.length > 0);

    expect(fakeProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        nodeId: 'node-1',
        sensorType: 'soil-moisture',
      }),
    );
  });

  it('relays a valid heartbeat message from MQTT to the Kafka producer', async () => {
    testClient.publish(
      'nodes/node-2/heartbeat',
      JSON.stringify({
        type: 'heartbeat',
        nodeId: 'node-2',
        timestamp: new Date().toISOString(),
      }),
    );

    await waitFor(() => fakeProducer.send.mock.calls.length > 0);

    expect(fakeProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({ nodeId: 'node-2', type: 'heartbeat' }),
    );
  });

  it('does not forward a malformed payload and records an audit error', async () => {
    testClient.publish('nodes/node-3/heartbeat', 'not-json');

    await waitFor(() => auditEntries.length > 0);

    expect(fakeProducer.send).not.toHaveBeenCalled();
    expect(auditEntries[0]).toMatchObject({
      direction: 'inbound',
      outcome: 'error',
    });
  });

  it('publishes a command envelope to the node command topic over MQTT', async () => {
    const publisher = moduleRef.get(MqttCommandPublisherService);

    const received = new Promise<string>((resolve) => {
      testClient.subscribe('nodes/node-4/commands', () => {
        testClient.once('message', (_topic, payload) =>
          resolve(payload.toString()),
        );
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const envelope = {
      type: BridgeMessageTypeEnum.COMMAND,
      nodeId: 'node-4',
      timestamp: new Date().toISOString(),
      commandId: 'cmd-1',
      action: 'open-valve',
    } as const;

    await publisher.publish('node-4', envelope);

    const payload = await received;
    expect(JSON.parse(payload)).toMatchObject({
      commandId: 'cmd-1',
      action: 'open-valve',
    });
  });
});

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5000,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('waitFor timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}
