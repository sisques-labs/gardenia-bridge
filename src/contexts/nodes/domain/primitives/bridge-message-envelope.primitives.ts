import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';

export interface IBridgeMessageEnvelopePrimitives {
  type: BridgeMessageTypeEnum;
  nodeId: string;
  timestamp: string;
}
