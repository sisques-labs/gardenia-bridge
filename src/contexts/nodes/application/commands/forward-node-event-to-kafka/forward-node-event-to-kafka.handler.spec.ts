import { EventBus } from '@nestjs/cqrs';

import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { ITelemetryMessagePrimitives } from '@contexts/nodes/domain/primitives/telemetry-message.primitives';
import { IBridgeMessageLogWriteRepository } from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { KafkaBridgeProducerService } from '@contexts/nodes/infrastructure/kafka/kafka-bridge-producer.service';
import { ForwardNodeEventToKafkaCommand } from './forward-node-event-to-kafka.command';
import { ForwardNodeEventToKafkaHandler } from './forward-node-event-to-kafka.handler';

describe('ForwardNodeEventToKafkaHandler', () => {
  let handler: ForwardNodeEventToKafkaHandler;
  let producer: jest.Mocked<KafkaBridgeProducerService>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;
  let eventBus: jest.Mocked<EventBus>;

  const envelope: ITelemetryMessagePrimitives = {
    type: BridgeMessageTypeEnum.TELEMETRY,
    nodeId: '11111111-1111-4111-8111-111111111111',
    timestamp: '2026-07-10T10:00:00Z',
    sensorType: 'soil-moisture',
    value: 42.5,
  };

  const command = new ForwardNodeEventToKafkaCommand({
    sourceTopic:
      'sensors/11111111-1111-4111-8111-111111111111/soil-moisture/telemetry',
    rawPayload: JSON.stringify(envelope),
    envelope,
  });

  let publishedEvents: unknown[];

  beforeEach(() => {
    publishedEvents = [];
    producer = {
      send: jest.fn(),
    } as unknown as jest.Mocked<KafkaBridgeProducerService>;
    auditRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;
    eventBus = {
      publishAll: jest.fn((events: unknown[]) => {
        publishedEvents = [...events];
      }),
    } as unknown as jest.Mocked<EventBus>;
    handler = new ForwardNodeEventToKafkaHandler(
      producer,
      auditRepository,
      eventBus,
    );
  });

  it('sends the envelope to Kafka and records a success audit entry', async () => {
    producer.send.mockResolvedValue('gardenia-bridge.telemetry');

    await handler.execute(command);

    expect(producer.send).toHaveBeenCalledWith(command.envelope);
    expect(auditRepository.save).toHaveBeenCalledTimes(1);

    const aggregate = auditRepository.save.mock.calls[0][0];
    expect(aggregate.toPrimitives()).toEqual(
      expect.objectContaining({
        direction: 'inbound',
        type: BridgeMessageTypeEnum.TELEMETRY,
        nodeId: '11111111-1111-4111-8111-111111111111',
        sourceTopic: command.sourceTopic.value,
        destinationTopic: 'gardenia-bridge.telemetry',
        outcome: 'success',
        errorReason: null,
      }),
    );
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(publishedEvents).toHaveLength(1);
  });

  it('records an error audit entry and does not throw when the producer fails', async () => {
    producer.send.mockRejectedValue(new Error('broker unreachable'));

    await expect(handler.execute(command)).resolves.toBeUndefined();

    expect(auditRepository.save).toHaveBeenCalledTimes(1);
    const aggregate = auditRepository.save.mock.calls[0][0];
    expect(aggregate.toPrimitives()).toEqual(
      expect.objectContaining({
        direction: 'inbound',
        outcome: 'error',
        destinationTopic: null,
        errorReason: 'broker unreachable',
      }),
    );
  });
});
