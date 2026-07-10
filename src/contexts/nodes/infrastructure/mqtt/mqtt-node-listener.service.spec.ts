import { CommandBus } from '@nestjs/cqrs';

import { IBridgeMessageLogWriteRepository } from '../../domain/repositories/write/bridge-message-log-write.repository';
import { ForwardNodeEventToKafkaCommand } from '../../application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.command';
import { MqttClientProvider } from './mqtt-client.provider';
import { MqttNodeListenerService } from './mqtt-node-listener.service';

describe('MqttNodeListenerService', () => {
  let service: MqttNodeListenerService;
  let mqttClientProvider: jest.Mocked<MqttClientProvider>;
  let commandBus: jest.Mocked<CommandBus>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;
  let handlers: Record<string, (...args: unknown[]) => void>;
  let fakeClient: { on: jest.Mock; subscribe: jest.Mock };

  beforeEach(() => {
    handlers = {};
    fakeClient = {
      on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
        handlers[event] = cb;
        return fakeClient;
      }),
      subscribe: jest.fn((_topics: unknown, cb: (error?: Error) => void) =>
        cb(),
      ),
    };

    mqttClientProvider = {
      getClient: jest.fn().mockReturnValue(fakeClient),
    } as unknown as jest.Mocked<MqttClientProvider>;
    commandBus = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CommandBus>;
    auditRepository = {
      record: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;

    service = new MqttNodeListenerService(
      mqttClientProvider,
      commandBus,
      auditRepository,
    );
    service.onModuleInit();
  });

  it('subscribes to the three node event topic patterns on connect', () => {
    handlers.connect();

    expect(fakeClient.subscribe).toHaveBeenCalledWith(
      ['sensors/+/+/telemetry', 'nodes/+/heartbeat', 'nodes/+/commands/ack'],
      expect.any(Function),
    );
  });

  it('dispatches ForwardNodeEventToKafkaCommand for a valid telemetry message', async () => {
    const payload = Buffer.from(
      JSON.stringify({
        type: 'telemetry',
        nodeId: 'node-1',
        timestamp: '2026-07-10T10:00:00Z',
        sensorType: 'soil-moisture',
        value: 42.5,
      }),
    );

    handlers.message('sensors/node-1/soil-moisture/telemetry', payload);
    await Promise.resolve();
    await Promise.resolve();

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(ForwardNodeEventToKafkaCommand),
    );
    expect(auditRepository.record).not.toHaveBeenCalled();
  });

  it('records an audit error entry and does not dispatch a command for an invalid payload', async () => {
    handlers.message(
      'sensors/node-1/soil-moisture/telemetry',
      Buffer.from('not-json'),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'inbound',
        type: 'unknown',
        nodeId: 'node-1',
        outcome: 'error',
      }),
    );
  });

  it('records an audit error entry for a message on an unrecognized topic', async () => {
    handlers.message('unknown/topic', Buffer.from('{}'));
    await Promise.resolve();
    await Promise.resolve();

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'inbound',
        nodeId: null,
        sourceTopic: 'unknown/topic',
        outcome: 'error',
      }),
    );
  });
});
