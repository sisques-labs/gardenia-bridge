import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';

export interface IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum;
  nodeId: string;
  timestamp: string;
}
