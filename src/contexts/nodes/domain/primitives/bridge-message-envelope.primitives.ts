import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';

export interface IBridgeMessageEnvelopePrimitives {
  type: BridgeMessageTypeEnum;
  nodeId: string;
  timestamp: string;
}
