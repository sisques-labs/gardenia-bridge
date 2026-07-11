import { BasePrimitives } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionEnum } from '../enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '../enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';

export interface IBridgeMessageLogPrimitives extends BasePrimitives {
  direction: BridgeMessageDirectionEnum;
  type: BridgeMessageTypeEnum;
  nodeId: string | null;
  sourceTopic: string;
  destinationTopic: string | null;
  rawPayload: string;
  outcome: BridgeMessageOutcomeEnum;
  errorReason: string | null;
  processedAt: string;
}
