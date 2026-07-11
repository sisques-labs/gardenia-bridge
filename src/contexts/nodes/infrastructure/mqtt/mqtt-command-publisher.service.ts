import { Injectable, Logger } from '@nestjs/common';

import { commandMessageToPrimitives } from '../../domain/factories/command-message.factory';
import { ICommandMessage } from '../../domain/interfaces/command-message.interface';
import { MqttClientProvider } from './mqtt-client.provider';

@Injectable()
export class MqttCommandPublisherService {
  private readonly logger = new Logger(MqttCommandPublisherService.name);

  constructor(private readonly mqttClientProvider: MqttClientProvider) {}

  publish(nodeId: string, envelope: ICommandMessage): Promise<string> {
    const topic = `nodes/${nodeId}/commands`;
    const payload = JSON.stringify(commandMessageToPrimitives(envelope));
    const commandId = envelope.commandId.value;

    this.logger.log(`Publishing command ${commandId} to "${topic}"`);

    return new Promise<string>((resolve, reject) => {
      this.mqttClientProvider
        .getClient()
        .publish(topic, payload, { qos: 1 }, (error) => {
          if (error) {
            this.logger.error(
              `Failed to publish command ${commandId} to "${topic}": ${error.message}`,
            );
            reject(error);
            return;
          }
          this.logger.log(`Published command ${commandId} to "${topic}"`);
          resolve(topic);
        });
    });
  }
}
