import { DateValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionValueObject } from '../value-objects/bridge-message-direction/bridge-message-direction.value-object';
import { BridgeMessageOutcomeValueObject } from '../value-objects/bridge-message-outcome/bridge-message-outcome.value-object';
import { BridgeMessageTypeValueObject } from '../value-objects/bridge-message-type/bridge-message-type.value-object';
import { ErrorReasonValueObject } from '../value-objects/error-reason/error-reason.value-object';
import { NodeIdValueObject } from '../value-objects/node-id/node-id.value-object';
import { RawPayloadValueObject } from '../value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '../value-objects/topic/topic.value-object';

export interface IBridgeMessageLog {
  direction: BridgeMessageDirectionValueObject;
  type: BridgeMessageTypeValueObject;
  nodeId: NodeIdValueObject | null;
  sourceTopic: TopicValueObject;
  destinationTopic: TopicValueObject | null;
  rawPayload: RawPayloadValueObject;
  outcome: BridgeMessageOutcomeValueObject;
  errorReason: ErrorReasonValueObject | null;
  processedAt: DateValueObject;
}
