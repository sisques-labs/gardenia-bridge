import { BridgeMessageTypeEnum } from '../../../domain/enums/bridge-message-type.enum';
import { ICommandMessage } from '../../../domain/interfaces/command-message.interface';
import { IBridgeMessageLogWriteRepository } from '../../../domain/repositories/write/bridge-message-log-write.repository';
import { MqttCommandPublisherService } from '../../../infrastructure/mqtt/mqtt-command-publisher.service';
import { ForwardCommandToNodeCommand } from './forward-command-to-node.command';
import { ForwardCommandToNodeHandler } from './forward-command-to-node.handler';

describe('ForwardCommandToNodeHandler', () => {
  let handler: ForwardCommandToNodeHandler;
  let publisher: jest.Mocked<MqttCommandPublisherService>;
  let auditRepository: jest.Mocked<IBridgeMessageLogWriteRepository>;

  const envelope: ICommandMessage = {
    type: BridgeMessageTypeEnum.COMMAND,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    commandId: 'cmd-1',
    action: 'open-valve',
  };

  const command = new ForwardCommandToNodeCommand({
    sourceTopic: 'gardenia-bridge.commands',
    rawPayload: JSON.stringify(envelope),
    envelope,
  });

  beforeEach(() => {
    publisher = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<MqttCommandPublisherService>;
    auditRepository = {
      record: jest.fn(),
    } as unknown as jest.Mocked<IBridgeMessageLogWriteRepository>;
    handler = new ForwardCommandToNodeHandler(publisher, auditRepository);
  });

  it('publishes the command over MQTT and records a success audit entry', async () => {
    publisher.publish.mockResolvedValue('nodes/node-1/commands');

    await handler.execute(command);

    expect(publisher.publish).toHaveBeenCalledWith('node-1', envelope);
    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'outbound',
        type: BridgeMessageTypeEnum.COMMAND,
        nodeId: 'node-1',
        destinationTopic: 'nodes/node-1/commands',
        outcome: 'success',
        errorReason: null,
      }),
    );
  });

  it('records an error audit entry and does not throw when the publish fails', async () => {
    publisher.publish.mockRejectedValue(new Error('mqtt disconnected'));

    await expect(handler.execute(command)).resolves.toBeUndefined();

    expect(auditRepository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        direction: 'outbound',
        outcome: 'error',
        destinationTopic: null,
        errorReason: 'mqtt disconnected',
      }),
    );
  });
});
