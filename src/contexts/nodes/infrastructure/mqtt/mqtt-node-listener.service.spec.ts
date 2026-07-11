import { CommandBus, EventBus } from '@nestjs/cqrs';

import { ForwardNodeEventToKafkaCommand } from '@contexts/nodes/application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.command';
import { IBridgeMessageLogWriteRepository } from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { MqttClientProvider } from './mqtt-client.provider';
import { MqttNodeListenerService } from './mqtt-node-listener.service';

describe('MqttNodeListenerService', () => {
  let service: MqttNodeListenerService;
  let mqttClientProvider: jest.Mocked<MqttClientProvider>;
  let commandBus: jest.Mocked<CommandBus>;
  let eventBus: jest.Mocked<EventBus>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;
  let handlers: Record<string, (...args: unknown[]) => void>;
  let fakeClient: { on: jest.Mock; subscribe: jest.Mock };

  const nodeId = '11111111-1111-4111-8111-111111111111';

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
    eventBus = {
      publishAll: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;
    auditRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;

    service = new MqttNodeListenerService(
      mqttClientProvider,
      commandBus,
      eventBus,
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
        nodeId,
        timestamp: '2026-07-10T10:00:00Z',
        sensorType: 'soil-moisture',
        value: 42.5,
      }),
    );

    handlers.message(`sensors/${nodeId}/soil-moisture/telemetry`, payload);
    await Promise.resolve();
    await Promise.resolve();

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(ForwardNodeEventToKafkaCommand),
    );
    expect(auditRepository.save).not.toHaveBeenCalled();
  });

  it('records an audit error entry and does not dispatch a command for an invalid payload', async () => {
    handlers.message(
      `sensors/${nodeId}/soil-moisture/telemetry`,
      Buffer.from('not-json'),
    );
    await Promise.resolve();
    await Promise.resolve();

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(auditRepository.save).toHaveBeenCalledTimes(1);

    const aggregate = auditRepository.save.mock.calls[0][0];
    expect(aggregate.toPrimitives()).toEqual(
      expect.objectContaining({
        direction: 'inbound',
        type: 'unknown',
        nodeId,
        outcome: 'error',
      }),
    );
  });

  it('records an audit error entry for a message on an unrecognized topic', async () => {
    handlers.message('unknown/topic', Buffer.from('{}'));
    await Promise.resolve();
    await Promise.resolve();

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(auditRepository.save).toHaveBeenCalledTimes(1);

    const aggregate = auditRepository.save.mock.calls[0][0];
    expect(aggregate.toPrimitives()).toEqual(
      expect.objectContaining({
        direction: 'inbound',
        nodeId: null,
        sourceTopic: 'unknown/topic',
        outcome: 'error',
      }),
    );
  });
});
