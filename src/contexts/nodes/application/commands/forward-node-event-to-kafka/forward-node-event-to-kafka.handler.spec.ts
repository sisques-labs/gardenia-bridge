import { EventBus } from '@nestjs/cqrs';

import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
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
      new BridgeMessageLogBuilder(),
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

  it('does not corrupt state when two commands share the same injected builder and interleave across the await (DI-singleton safety)', async () => {
    // Regression test: bridgeMessageLogBuilder is a DI singleton, so every
    // execute() call on this handler shares the same instance. Fields must
    // never be read off it after an `await` — the whole with*()...build()
    // chain has to be one synchronous unit — or a second in-flight command
    // landing in the gap would stomp on the first one's state.
    const sharedBuilder = new BridgeMessageLogBuilder();
    const slowHandler = new ForwardNodeEventToKafkaHandler(
      producer,
      auditRepository,
      sharedBuilder,
      eventBus,
    );

    const nodeIdA = '11111111-1111-4111-8111-111111111111';
    const nodeIdB = '22222222-2222-4222-8222-222222222222';

    const commandA = new ForwardNodeEventToKafkaCommand({
      sourceTopic: `sensors/${nodeIdA}/soil-moisture/telemetry`,
      rawPayload: JSON.stringify({ ...envelope, nodeId: nodeIdA }),
      envelope: { ...envelope, nodeId: nodeIdA },
    });
    const commandB = new ForwardNodeEventToKafkaCommand({
      sourceTopic: `sensors/${nodeIdB}/soil-moisture/telemetry`,
      rawPayload: JSON.stringify({ ...envelope, nodeId: nodeIdB }),
      envelope: { ...envelope, nodeId: nodeIdB },
    });

    // commandA's producer.send resolves AFTER commandB's, forcing commandB
    // to finish its full build+save while commandA is still awaiting.
    producer.send.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve('gardenia-bridge.telemetry'), 20),
        ),
    );
    producer.send.mockImplementationOnce(() =>
      Promise.resolve('gardenia-bridge.telemetry'),
    );

    await Promise.all([
      slowHandler.execute(commandA),
      slowHandler.execute(commandB),
    ]);

    expect(auditRepository.save).toHaveBeenCalledTimes(2);
    const savedNodeIds = auditRepository.save.mock.calls.map(
      ([aggregate]) => aggregate.toPrimitives().nodeId,
    );
    expect(savedNodeIds.sort()).toEqual([nodeIdA, nodeIdB].sort());
  });
});
