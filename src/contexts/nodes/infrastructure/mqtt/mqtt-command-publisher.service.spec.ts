import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import {
  buildCommandMessage,
  commandMessageToPrimitives,
} from '@contexts/nodes/domain/factories/command-message.factory';
import { MqttClientProvider } from './mqtt-client.provider';
import { MqttCommandPublisherService } from './mqtt-command-publisher.service';

describe('MqttCommandPublisherService', () => {
  let service: MqttCommandPublisherService;
  let mqttClientProvider: jest.Mocked<MqttClientProvider>;
  let publishMock: jest.Mock;

  const nodeId = '11111111-1111-4111-8111-111111111111';

  const envelope = buildCommandMessage({
    type: BridgeMessageTypeEnum.COMMAND,
    nodeId,
    timestamp: '2026-07-10T10:00:00Z',
    commandId: '22222222-2222-4222-8222-222222222222',
    action: 'open-valve',
  });

  beforeEach(() => {
    publishMock = jest.fn();
    mqttClientProvider = {
      getClient: jest.fn().mockReturnValue({ publish: publishMock }),
    } as unknown as jest.Mocked<MqttClientProvider>;
    service = new MqttCommandPublisherService(mqttClientProvider);
  });

  it('publishes the command to nodes/{nodeId}/commands with QoS 1, serialized as primitives', async () => {
    publishMock.mockImplementation((_topic, _payload, _opts, cb) => cb());

    const topic = await service.publish(nodeId, envelope);

    expect(topic).toBe(`nodes/${nodeId}/commands`);
    expect(publishMock).toHaveBeenCalledWith(
      `nodes/${nodeId}/commands`,
      JSON.stringify(commandMessageToPrimitives(envelope)),
      { qos: 1 },
      expect.any(Function),
    );
  });

  it('rejects when the underlying publish fails', async () => {
    const error = new Error('not connected');
    publishMock.mockImplementation((_topic, _payload, _opts, cb) => cb(error));

    await expect(service.publish(nodeId, envelope)).rejects.toThrow(
      'not connected',
    );
  });
});
