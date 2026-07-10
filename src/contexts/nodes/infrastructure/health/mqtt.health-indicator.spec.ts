import { MqttClientProvider } from '../mqtt/mqtt-client.provider';
import { MqttHealthIndicator } from './mqtt.health-indicator';

describe('MqttHealthIndicator', () => {
  let indicator: MqttHealthIndicator;
  let mqttClientProvider: jest.Mocked<MqttClientProvider>;

  beforeEach(() => {
    mqttClientProvider = {
      isConnected: jest.fn(),
    } as unknown as jest.Mocked<MqttClientProvider>;
    indicator = new MqttHealthIndicator(mqttClientProvider);
  });

  it('reports up when the MQTT client is connected', () => {
    mqttClientProvider.isConnected.mockReturnValue(true);

    expect(indicator.check('mqtt')).toEqual({ mqtt: { status: 'up' } });
  });

  it('reports down when the MQTT client is disconnected', () => {
    mqttClientProvider.isConnected.mockReturnValue(false);

    expect(indicator.check('mqtt')).toEqual({ mqtt: { status: 'down' } });
  });
});
