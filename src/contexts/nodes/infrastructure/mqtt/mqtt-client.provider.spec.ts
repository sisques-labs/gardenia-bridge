import { ConfigService } from '@nestjs/config';

import { MqttClientProvider } from './mqtt-client.provider';

const fakeClient = {
  on: jest.fn().mockReturnThis(),
  end: jest.fn(),
  connected: false,
};

jest.mock('mqtt', () => ({
  connect: jest.fn(() => fakeClient),
}));

describe('MqttClientProvider', () => {
  let provider: MqttClientProvider;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    jest.clearAllMocks();
    fakeClient.connected = false;
    configService = {
      getOrThrow: jest.fn().mockReturnValue({
        url: 'mqtt://localhost:1883',
        username: null,
        password: null,
        clientId: 'gardenia-bridge',
      }),
    } as unknown as jest.Mocked<ConfigService>;
    provider = new MqttClientProvider(configService);
  });

  it('throws if getClient is called before onModuleInit', () => {
    expect(() => provider.getClient()).toThrow(/used before onModuleInit ran/);
  });

  it('connects and exposes the client after onModuleInit', () => {
    provider.onModuleInit();

    expect(provider.getClient()).toBe(fakeClient);
  });

  it('reports isConnected() based on the underlying client state', () => {
    provider.onModuleInit();
    expect(provider.isConnected()).toBe(false);

    fakeClient.connected = true;
    expect(provider.isConnected()).toBe(true);
  });

  it('returns false for isConnected() before onModuleInit', () => {
    expect(provider.isConnected()).toBe(false);
  });

  it('ends the client on module destroy', () => {
    provider.onModuleInit();
    provider.onModuleDestroy();

    expect(fakeClient.end).toHaveBeenCalledWith(true);
  });
});
