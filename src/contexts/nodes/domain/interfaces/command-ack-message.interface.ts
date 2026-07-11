import { AckMessageValueObject } from '../value-objects/ack-message/ack-message.value-object';
import { CommandIdValueObject } from '../value-objects/command-id/command-id.value-object';
import { CommandSuccessValueObject } from '../value-objects/command-success/command-success.value-object';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ICommandAckMessage extends IBridgeMessageEnvelope {
  commandId: CommandIdValueObject;
  success: CommandSuccessValueObject;
  message?: AckMessageValueObject;
}
