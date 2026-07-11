import { IBaseEventData } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';

export interface IBridgeMessageLogEventData extends IBaseEventData {
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
