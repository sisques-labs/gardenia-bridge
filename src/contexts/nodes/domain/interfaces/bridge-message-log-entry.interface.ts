import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { BridgeMessageDirection } from './bridge-message-direction.type';

export interface IBridgeMessageLogEntry {
  id?: string;
  direction: BridgeMessageDirection;
  type: BridgeMessageTypeEnum | 'unknown';
  nodeId: string | null;
  sourceTopic: string;
  destinationTopic: string | null;
  rawPayload: string;
  outcome: 'success' | 'error';
  errorReason: string | null;
  processedAt: string;
}
