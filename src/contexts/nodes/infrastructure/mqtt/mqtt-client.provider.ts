import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, MqttClient } from 'mqtt';

import { IMqttConfig } from '@core/config/mqtt.config';

@Injectable()
export class MqttClientProvider implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttClientProvider.name);
  private client: MqttClient | null = null;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const config = this.configService.getOrThrow<IMqttConfig>('mqtt');

    this.client = connect(config.url, {
      clientId: config.clientId,
      username: config.username ?? undefined,
      password: config.password ?? undefined,
      reconnectPeriod: 2000,
    });

    this.client.on('connect', () => {
      this.logger.log(`Connected to MQTT broker at ${config.url}`);
    });
    this.client.on('reconnect', () => {
      this.logger.warn('Reconnecting to MQTT broker...');
    });
    this.client.on('close', () => {
      this.logger.warn('MQTT connection closed');
    });
    this.client.on('error', (error) => {
      this.logger.error(`MQTT client error: ${error.message}`);
    });
  }

  onModuleDestroy(): void {
    this.client?.end(true);
  }

  getClient(): MqttClient {
    if (!this.client) {
      throw new Error('MqttClientProvider used before onModuleInit ran');
    }
    return this.client;
  }

  isConnected(): boolean {
    return this.client?.connected ?? false;
  }
}
