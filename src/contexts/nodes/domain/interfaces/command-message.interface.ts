import { CommandActionValueObject } from '../value-objects/command-action/command-action.value-object';
import { CommandIdValueObject } from '../value-objects/command-id/command-id.value-object';
import { CommandParamsValueObject } from '../value-objects/command-params/command-params.value-object';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ICommandMessage extends IBridgeMessageEnvelope {
  commandId: CommandIdValueObject;
  action: CommandActionValueObject;
  params?: CommandParamsValueObject;
}
