import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';

import { ForwardCommandToNodeCommand } from '../../application/commands/forward-command-to-node/forward-command-to-node.command';
import { IBridgeMessageLogWriteRepository } from '../../domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeCommandsConsumerService } from './kafka-bridge-commands-consumer.service';

let capturedEachMessage:
  | ((payload: {
      topic: string;
      message: { value: Buffer | null };
    }) => Promise<void>)
  | null = null;

const mockConsumer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  subscribe: jest.fn(),
  run: jest.fn((config: { eachMessage: typeof capturedEachMessage }) => {
    capturedEachMessage = config.eachMessage;
    return Promise.resolve();
  }),
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    consumer: () => mockConsumer,
  })),
}));

describe('KafkaBridgeCommandsConsumerService', () => {
  let service: KafkaBridgeCommandsConsumerService;
  let configService: jest.Mocked<ConfigService>;
  let commandBus: jest.Mocked<CommandBus>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;

  const baseConfig = {
    enabled: true,
    clientId: 'gardenia-bridge',
    brokers: ['localhost:9092'],
    topicPrefix: 'gardenia-bridge',
    ssl: false,
    sasl: null,
    bridgeTelemetryTopic: 'gardenia-bridge.telemetry',
    bridgeHeartbeatTopic: 'gardenia-bridge.heartbeat',
    bridgeCommandAcksTopic: 'gardenia-bridge.command-acks',
    bridgeCommandsTopic: 'gardenia-bridge.commands',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedEachMessage = null;
    configService = {
      getOrThrow: jest.fn().mockReturnValue(baseConfig),
    } as unknown as jest.Mocked<ConfigService>;
    commandBus = { execute: jest.fn() } as unknown as jest.Mocked<CommandBus>;
    auditRepository = {
      record: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;
    service = new KafkaBridgeCommandsConsumerService(
      configService,
      commandBus,
      auditRepository,
    );
  });

  it('connects, subscribes, and reports connected when Kafka is enabled', async () => {
    await service.onModuleInit();

    expect(mockConsumer.connect).toHaveBeenCalled();
    expect(mockConsumer.subscribe).toHaveBeenCalledWith({
      topic: 'gardenia-bridge.commands',
      fromBeginning: false,
    });
    expect(service.isConnected()).toBe(true);
  });

  it('does not connect and reports connected=true when Kafka is disabled', async () => {
    configService.getOrThrow.mockReturnValue({ ...baseConfig, enabled: false });

    await service.onModuleInit();

    expect(mockConsumer.connect).not.toHaveBeenCalled();
    expect(service.isConnected()).toBe(true);
  });

  it('dispatches ForwardCommandToNodeCommand for a valid message', async () => {
    await service.onModuleInit();

    const payload = JSON.stringify({
      type: 'command',
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
      commandId: 'cmd-1',
      action: 'open-valve',
    });

    await capturedEachMessage?.({
      topic: 'gardenia-bridge.commands',
      message: { value: Buffer.from(payload) },
    });

    expect(commandBus.execute).toHaveBeenCalledWith(
      expect.any(ForwardCommandToNodeCommand),
    );
    expect(auditRepository.record).not.toHaveBeenCalled();
  });

  it('records an audit error entry and does not dispatch for an invalid message', async () => {
    await service.onModuleInit();

    await capturedEachMessage?.({
      topic: 'gardenia-bridge.commands',
      message: { value: Buffer.from('not-json') },
    });

    expect(commandBus.execute).not.toHaveBeenCalled();
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'outbound',
        type: 'unknown',
        outcome: 'error',
      }),
    );
  });

  it('disconnects the consumer on module destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockConsumer.disconnect).toHaveBeenCalled();
  });
});
