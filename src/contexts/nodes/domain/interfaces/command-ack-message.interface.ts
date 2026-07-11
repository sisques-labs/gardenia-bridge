import { AckMessageValueObject } from '@contexts/nodes/domain/value-objects/ack-message/ack-message.value-object';
import { CommandIdValueObject } from '@contexts/nodes/domain/value-objects/command-id/command-id.value-object';
import { CommandSuccessValueObject } from '@contexts/nodes/domain/value-objects/command-success/command-success.value-object';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ICommandAckMessage extends IBridgeMessageEnvelope {
  commandId: CommandIdValueObject;
  success: CommandSuccessValueObject;
  message?: AckMessageValueObject;
}
