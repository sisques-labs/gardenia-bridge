import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface IHeartbeatMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.HEARTBEAT;
  status?: string;
  uptimeSeconds?: number;
}
