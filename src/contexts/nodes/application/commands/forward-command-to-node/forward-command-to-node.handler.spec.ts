import { EventBus } from '@nestjs/cqrs';

import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { ICommandMessagePrimitives } from '@contexts/nodes/domain/primitives/command-message.primitives';
import { IBridgeMessageLogWriteRepository } from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { MqttCommandPublisherService } from '@contexts/nodes/infrastructure/mqtt/mqtt-command-publisher.service';
import { ForwardCommandToNodeCommand } from './forward-command-to-node.command';
import { ForwardCommandToNodeHandler } from './forward-command-to-node.handler';

describe('ForwardCommandToNodeHandler', () => {
  let handler: ForwardCommandToNodeHandler;
  let publisher: jest.Mocked<MqttCommandPublisherService>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;
  let eventBus: jest.Mocked<EventBus>;
  let publishedEvents: unknown[];

  const nodeId = '22222222-2222-4222-8222-222222222222';

  const envelope: ICommandMessagePrimitives = {
    type: BridgeMessageTypeEnum.COMMAND,
    nodeId,
    timestamp: '2026-07-10T10:00:00Z',
    commandId: '33333333-3333-4333-8333-333333333333',
    action: 'open-valve',
  };

  const command = new ForwardCommandToNodeCommand({
    sourceTopic: 'gardenia-bridge.commands',
    rawPayload: JSON.stringify(envelope),
    envelope,
  });

  beforeEach(() => {
    publishedEvents = [];
    publisher = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<MqttCommandPublisherService>;
    auditRepository = {
      save: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;
    eventBus = {
      publishAll: jest.fn((events: unknown[]) => {
        publishedEvents = [...events];
      }),
    } as unknown as jest.Mocked<EventBus>;
    handler = new ForwardCommandToNodeHandler(
      publisher,
      auditRepository,
      new BridgeMessageLogBuilder(),
      eventBus,
    );
  });

  it('publishes the command over MQTT and records a success audit entry', async () => {
    publisher.publish.mockResolvedValue(`nodes/${nodeId}/commands`);

    await handler.execute(command);

    expect(publisher.publish).toHaveBeenCalledWith(nodeId, command.envelope);
    expect(auditRepository.save).toHaveBeenCalledTimes(1);

    const aggregate = auditRepository.save.mock.calls[0][0];
    expect(aggregate.toPrimitives()).toEqual(
      expect.objectContaining({
        direction: 'outbound',
        type: BridgeMessageTypeEnum.COMMAND,
        nodeId,
        destinationTopic: `nodes/${nodeId}/commands`,
        outcome: 'success',
        errorReason: null,
      }),
    );
    expect(eventBus.publishAll).toHaveBeenCalledTimes(1);
    expect(publishedEvents).toHaveLength(1);
  });

  it('records an error audit entry and does not throw when the publish fails', async () => {
    publisher.publish.mockRejectedValue(new Error('mqtt disconnected'));

    await expect(handler.execute(command)).resolves.toBeUndefined();

    expect(auditRepository.save).toHaveBeenCalledTimes(1);
    const aggregate = auditRepository.save.mock.calls[0][0];
    expect(aggregate.toPrimitives()).toEqual(
      expect.objectContaining({
        direction: 'outbound',
        outcome: 'error',
        destinationTopic: null,
        errorReason: 'mqtt disconnected',
      }),
    );
  });
});
