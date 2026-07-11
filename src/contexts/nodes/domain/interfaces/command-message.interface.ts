import { CommandActionValueObject } from '@contexts/nodes/domain/value-objects/command-action/command-action.value-object';
import { CommandIdValueObject } from '@contexts/nodes/domain/value-objects/command-id/command-id.value-object';
import { CommandParamsValueObject } from '@contexts/nodes/domain/value-objects/command-params/command-params.value-object';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ICommandMessage extends IBridgeMessageEnvelope {
  commandId: CommandIdValueObject;
  action: CommandActionValueObject;
  params?: CommandParamsValueObject;
}
