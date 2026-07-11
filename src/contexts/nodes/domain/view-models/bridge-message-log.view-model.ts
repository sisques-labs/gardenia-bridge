import { BaseViewModel } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionEnum } from '../enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '../enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';

// Not exposed via any query/transport today (the audit log is write-only —
// see design.md) but kept so BridgeMessageLogBuilder can implement the
// standard IBuilder<TAggregate, TViewModel> contract.
export class BridgeMessageLogViewModel extends BaseViewModel {
  constructor(
    id: string,
    private readonly _direction: BridgeMessageDirectionEnum,
    private readonly _type: BridgeMessageTypeEnum,
    private readonly _nodeId: string | null,
    private readonly _sourceTopic: string,
    private readonly _destinationTopic: string | null,
    private readonly _rawPayload: string,
    private readonly _outcome: BridgeMessageOutcomeEnum,
    private readonly _errorReason: string | null,
    private readonly _processedAt: string,
    createdAt: Date,
    updatedAt: Date,
  ) {
    super(id, createdAt, updatedAt);
  }

  get direction(): BridgeMessageDirectionEnum {
    return this._direction;
  }

  get type(): BridgeMessageTypeEnum {
    return this._type;
  }

  get nodeId(): string | null {
    return this._nodeId;
  }

  get sourceTopic(): string {
    return this._sourceTopic;
  }

  get destinationTopic(): string | null {
    return this._destinationTopic;
  }

  get rawPayload(): string {
    return this._rawPayload;
  }

  get outcome(): BridgeMessageOutcomeEnum {
    return this._outcome;
  }

  get errorReason(): string | null {
    return this._errorReason;
  }

  get processedAt(): string {
    return this._processedAt;
  }
}
