import { BridgeMessageTypeEnum } from '../../domain/enums/bridge-message-type.enum';
import { ICommandMessage } from '../../domain/interfaces/command-message.interface';
import { MqttClientProvider } from './mqtt-client.provider';
import { MqttCommandPublisherService } from './mqtt-command-publisher.service';

describe('MqttCommandPublisherService', () => {
  let service: MqttCommandPublisherService;
  let mqttClientProvider: jest.Mocked<MqttClientProvider>;
  let publishMock: jest.Mock;

  const envelope: ICommandMessage = {
    type: BridgeMessageTypeEnum.COMMAND,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    commandId: 'cmd-1',
    action: 'open-valve',
  };

  beforeEach(() => {
    publishMock = jest.fn();
    mqttClientProvider = {
      getClient: jest.fn().mockReturnValue({ publish: publishMock }),
    } as unknown as jest.Mocked<MqttClientProvider>;
    service = new MqttCommandPublisherService(mqttClientProvider);
  });

  it('publishes the command to nodes/{nodeId}/commands with QoS 1', async () => {
    publishMock.mockImplementation((_topic, _payload, _opts, cb) => cb());

    const topic = await service.publish('node-1', envelope);

    expect(topic).toBe('nodes/node-1/commands');
    expect(publishMock).toHaveBeenCalledWith(
      'nodes/node-1/commands',
      JSON.stringify(envelope),
      { qos: 1 },
      expect.any(Function),
    );
  });

  it('rejects when the underlying publish fails', async () => {
    const error = new Error('not connected');
    publishMock.mockImplementation((_topic, _payload, _opts, cb) => cb(error));

    await expect(service.publish('node-1', envelope)).rejects.toThrow(
      'not connected',
    );
  });
});
