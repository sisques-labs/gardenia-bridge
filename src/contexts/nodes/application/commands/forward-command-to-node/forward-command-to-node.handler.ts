import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import {
  BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
  IBridgeMessageLogWriteRepository,
} from '../../../domain/repositories/write/bridge-message-log-write.repository';
import { MqttCommandPublisherService } from '../../../infrastructure/mqtt/mqtt-command-publisher.service';
import { ForwardCommandToNodeCommand } from './forward-command-to-node.command';

@CommandHandler(ForwardCommandToNodeCommand)
export class ForwardCommandToNodeHandler implements ICommandHandler<
  ForwardCommandToNodeCommand,
  void
> {
  private readonly logger = new Logger(ForwardCommandToNodeHandler.name);

  constructor(
    private readonly mqttCommandPublisher: MqttCommandPublisherService,
    @Inject(BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY)
    private readonly bridgeMessageLogWriteRepository: IBridgeMessageLogWriteRepository,
  ) {}

  async execute(command: ForwardCommandToNodeCommand): Promise<void> {
    const { sourceTopic, rawPayload, envelope } = command;

    try {
      const destinationTopic = await this.mqttCommandPublisher.publish(
        envelope.nodeId,
        envelope,
      );

      await this.bridgeMessageLogWriteRepository.record({
        direction: 'outbound',
        type: envelope.type,
        nodeId: envelope.nodeId,
        sourceTopic,
        destinationTopic,
        rawPayload,
        outcome: 'success',
        errorReason: null,
        processedAt: new Date().toISOString(),
      });

      this.logger.log(
        `Forwarded command ${envelope.commandId} for node ${envelope.nodeId} from ${sourceTopic} to ${destinationTopic}`,
      );
    } catch (error) {
      const errorReason =
        error instanceof Error ? error.message : String(error);

      await this.bridgeMessageLogWriteRepository.record({
        direction: 'outbound',
        type: envelope.type,
        nodeId: envelope.nodeId,
        sourceTopic,
        destinationTopic: null,
        rawPayload,
        outcome: 'error',
        errorReason,
        processedAt: new Date().toISOString(),
      });

      this.logger.error(
        `Failed to forward command ${envelope.commandId} for node ${envelope.nodeId} from ${sourceTopic}: ${errorReason}`,
      );
    }
  }
}
