import { DateValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageTypeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-type/bridge-message-type.value-object';
import { NodeIdValueObject } from '@contexts/nodes/domain/value-objects/node-id/node-id.value-object';

export interface IBridgeMessageEnvelope {
  type: BridgeMessageTypeValueObject;
  nodeId: NodeIdValueObject;
  timestamp: DateValueObject;
}
