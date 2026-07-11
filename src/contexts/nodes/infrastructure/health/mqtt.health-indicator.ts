import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

import { MqttClientProvider } from '@contexts/nodes/infrastructure/mqtt/mqtt-client.provider';

@Injectable()
export class MqttHealthIndicator extends HealthIndicator {
  constructor(private readonly mqttClientProvider: MqttClientProvider) {
    super();
  }

  check(key: string): HealthIndicatorResult {
    return this.getStatus(key, this.mqttClientProvider.isConnected());
  }
}
