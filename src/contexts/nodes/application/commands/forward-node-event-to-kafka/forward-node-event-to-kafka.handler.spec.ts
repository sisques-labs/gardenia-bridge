import { BridgeMessageTypeEnum } from '../../../domain/enums/bridge-message-type.enum';
import { IBridgeMessageLogWriteRepository } from '../../../domain/repositories/write/bridge-message-log-write.repository';
import { ITelemetryMessage } from '../../../domain/interfaces/telemetry-message.interface';
import { KafkaBridgeProducerService } from '../../../infrastructure/kafka/kafka-bridge-producer.service';
import { ForwardNodeEventToKafkaCommand } from './forward-node-event-to-kafka.command';
import { ForwardNodeEventToKafkaHandler } from './forward-node-event-to-kafka.handler';

describe('ForwardNodeEventToKafkaHandler', () => {
  let handler: ForwardNodeEventToKafkaHandler;
  let producer: jest.Mocked<KafkaBridgeProducerService>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;

  const envelope: ITelemetryMessage = {
    type: BridgeMessageTypeEnum.TELEMETRY,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    sensorType: 'soil-moisture',
    value: 42.5,
  };

  const command = new ForwardNodeEventToKafkaCommand({
    sourceTopic: 'sensors/node-1/soil-moisture/telemetry',
    rawPayload: JSON.stringify(envelope),
    envelope,
  });

  beforeEach(() => {
    producer = {
      send: jest.fn(),
    } as unknown as jest.Mocked<KafkaBridgeProducerService>;
    auditRepository = {
      record: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;
    handler = new ForwardNodeEventToKafkaHandler(producer, auditRepository);
  });

  it('sends the envelope to Kafka and records a success audit entry', async () => {
    producer.send.mockResolvedValue('gardenia-bridge.telemetry');

    await handler.execute(command);

    expect(producer.send).toHaveBeenCalledWith(envelope);
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'inbound',
        type: BridgeMessageTypeEnum.TELEMETRY,
        nodeId: 'node-1',
        sourceTopic: command.sourceTopic,
        destinationTopic: 'gardenia-bridge.telemetry',
        outcome: 'success',
        errorReason: null,
      }),
    );
  });

  it('records an error audit entry and does not throw when the producer fails', async () => {
    producer.send.mockRejectedValue(new Error('broker unreachable'));

    await expect(handler.execute(command)).resolves.toBeUndefined();

    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'inbound',
        outcome: 'error',
        destinationTopic: null,
        errorReason: 'broker unreachable',
      }),
    );
  });
});
