import { DateValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { ICommandMessagePrimitives } from '../primitives/command-message.primitives';
import { BridgeMessageTypeValueObject } from '../value-objects/bridge-message-type/bridge-message-type.value-object';
import { CommandActionValueObject } from '../value-objects/command-action/command-action.value-object';
import { CommandIdValueObject } from '../value-objects/command-id/command-id.value-object';
import { CommandParamsValueObject } from '../value-objects/command-params/command-params.value-object';
import { NodeIdValueObject } from '../value-objects/node-id/node-id.value-object';
import { ICommandMessage } from '../interfaces/command-message.interface';

export function buildCommandMessage(
  primitives: ICommandMessagePrimitives,
): ICommandMessage {
  return {
    type: new BridgeMessageTypeValueObject(primitives.type),
    nodeId: new NodeIdValueObject(primitives.nodeId),
    timestamp: new DateValueObject(new Date(primitives.timestamp)),
    commandId: new CommandIdValueObject(primitives.commandId),
    action: new CommandActionValueObject(primitives.action),
    params: primitives.params
      ? new CommandParamsValueObject(primitives.params)
      : undefined,
  };
}

export function commandMessageToPrimitives(
  message: ICommandMessage,
): ICommandMessagePrimitives {
  return {
    type: message.type.value as BridgeMessageTypeEnum,
    nodeId: message.nodeId.value,
    timestamp: message.timestamp.toISOString(),
    commandId: message.commandId.value,
    action: message.action.value,
    params: message.params?.value,
  };
}
