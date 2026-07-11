import { DateValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-direction/bridge-message-direction.value-object';
import { BridgeMessageOutcomeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-outcome/bridge-message-outcome.value-object';
import { BridgeMessageTypeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-type/bridge-message-type.value-object';
import { ErrorReasonValueObject } from '@contexts/nodes/domain/value-objects/error-reason/error-reason.value-object';
import { NodeIdValueObject } from '@contexts/nodes/domain/value-objects/node-id/node-id.value-object';
import { RawPayloadValueObject } from '@contexts/nodes/domain/value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '@contexts/nodes/domain/value-objects/topic/topic.value-object';

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
