import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ICommandMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.COMMAND;
  commandId: string;
  action: string;
  params?: Record<string, unknown>;
}
