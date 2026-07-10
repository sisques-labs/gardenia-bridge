import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ICommandAckMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.COMMAND_ACK;
  commandId: string;
  success: boolean;
  message?: string;
}
