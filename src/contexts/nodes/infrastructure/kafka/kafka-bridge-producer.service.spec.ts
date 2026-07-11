import { ConfigService } from '@nestjs/config';

import { BridgeMessageTypeEnum } from '../../domain/enums/bridge-message-type.enum';
import {
  buildCommandAckMessage,
  buildHeartbeatMessage,
  buildTelemetryMessage,
  nodeEventMessageToPrimitives,
} from '../../domain/factories/node-event-message.factory';
import { KafkaBridgeProducerService } from './kafka-bridge-producer.service';

const mockProducer = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  send: jest.fn(),
};

jest.mock('kafkajs', () => ({
  Kafka: jest.fn().mockImplementation(() => ({
    producer: () => mockProducer,
  })),
}));

describe('KafkaBridgeProducerService', () => {
  let service: KafkaBridgeProducerService;
  let configService: jest.Mocked<ConfigService>;

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

  const nodeId = '11111111-1111-4111-8111-111111111111';

  const telemetry = buildTelemetryMessage({
    type: BridgeMessageTypeEnum.TELEMETRY,
    nodeId,
    timestamp: '2026-07-10T10:00:00Z',
    sensorType: 'soil-moisture',
    value: 42.5,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    configService = {
      getOrThrow: jest.fn().mockReturnValue(baseConfig),
    } as unknown as jest.Mocked<ConfigService>;
    service = new KafkaBridgeProducerService(configService);
  });

  it('connects the producer when Kafka is enabled', async () => {
    await service.onModuleInit();

    expect(mockProducer.connect).toHaveBeenCalled();
    expect(service.isConnected()).toBe(true);
  });

  it('does not connect and reports connected=true when Kafka is disabled', async () => {
    configService.getOrThrow.mockReturnValue({ ...baseConfig, enabled: false });

    await service.onModuleInit();

    expect(mockProducer.connect).not.toHaveBeenCalled();
    expect(service.isConnected()).toBe(true);
  });

  it('sends telemetry to the telemetry topic keyed by nodeId, serialized as primitives', async () => {
    await service.onModuleInit();

    const topic = await service.send(telemetry);

    expect(topic).toBe('gardenia-bridge.telemetry');
    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: 'gardenia-bridge.telemetry',
      messages: [
        {
          key: nodeId,
          value: JSON.stringify(nodeEventMessageToPrimitives(telemetry)),
        },
      ],
    });
  });

  it('sends heartbeat to the heartbeat topic', async () => {
    await service.onModuleInit();

    const heartbeat = buildHeartbeatMessage({
      type: BridgeMessageTypeEnum.HEARTBEAT,
      nodeId,
      timestamp: '2026-07-10T10:00:00Z',
      status: 'online',
      uptimeSeconds: 120,
    });

    const topic = await service.send(heartbeat);

    expect(topic).toBe('gardenia-bridge.heartbeat');
  });

  it('sends command-ack to the command-acks topic', async () => {
    await service.onModuleInit();

    const commandAck = buildCommandAckMessage({
      type: BridgeMessageTypeEnum.COMMAND_ACK,
      nodeId,
      timestamp: '2026-07-10T10:00:00Z',
      commandId: '22222222-2222-4222-8222-222222222222',
      success: true,
    });

    const topic = await service.send(commandAck);

    expect(topic).toBe('gardenia-bridge.command-acks');
  });

  it('throws when sending while Kafka is disabled', async () => {
    configService.getOrThrow.mockReturnValue({ ...baseConfig, enabled: false });
    await service.onModuleInit();

    await expect(service.send(telemetry)).rejects.toThrow(
      /Kafka producer not connected/,
    );
  });

  it('disconnects the producer on module destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();

    expect(mockProducer.disconnect).toHaveBeenCalled();
  });
});
