import {
  BaseBuilder,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

import { BridgeMessageLogAggregate } from '@contexts/nodes/domain/aggregates/bridge-message-log.aggregate';
import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { BridgeMessageDirectionValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-direction/bridge-message-direction.value-object';
import { BridgeMessageOutcomeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-outcome/bridge-message-outcome.value-object';
import { BridgeMessageTypeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-type/bridge-message-type.value-object';
import { ErrorReasonValueObject } from '@contexts/nodes/domain/value-objects/error-reason/error-reason.value-object';
import { NodeIdValueObject } from '@contexts/nodes/domain/value-objects/node-id/node-id.value-object';
import { RawPayloadValueObject } from '@contexts/nodes/domain/value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '@contexts/nodes/domain/value-objects/topic/topic.value-object';
import { BridgeMessageLogViewModel } from '@contexts/nodes/domain/view-models/bridge-message-log.view-model';

export class BridgeMessageLogBuilder extends BaseBuilder<
  BridgeMessageLogAggregate,
  BridgeMessageLogViewModel
> {
  private _direction!: BridgeMessageDirectionValueObject;
  private _type!: BridgeMessageTypeValueObject;
  private _nodeId: NodeIdValueObject | null = null;
  private _sourceTopic!: TopicValueObject;
  private _destinationTopic: TopicValueObject | null = null;
  private _rawPayload!: RawPayloadValueObject;
  private _outcome!: BridgeMessageOutcomeValueObject;
  private _errorReason: ErrorReasonValueObject | null = null;
  private _processedAt!: DateValueObject;

  withDirection(direction: string): this {
    this._direction = new BridgeMessageDirectionValueObject(direction);
    return this;
  }

  withType(type: string): this {
    this._type = new BridgeMessageTypeValueObject(type);
    return this;
  }

  withNodeId(nodeId: string | null): this {
    this._nodeId = nodeId ? new NodeIdValueObject(nodeId) : null;
    return this;
  }

  withSourceTopic(sourceTopic: string): this {
    this._sourceTopic = new TopicValueObject(sourceTopic);
    return this;
  }

  withDestinationTopic(destinationTopic: string | null): this {
    this._destinationTopic = destinationTopic
      ? new TopicValueObject(destinationTopic)
      : null;
    return this;
  }

  withRawPayload(rawPayload: string): this {
    this._rawPayload = new RawPayloadValueObject(rawPayload);
    return this;
  }

  withOutcome(outcome: string): this {
    this._outcome = new BridgeMessageOutcomeValueObject(outcome);
    return this;
  }

  withErrorReason(errorReason: string | null): this {
    this._errorReason = errorReason
      ? new ErrorReasonValueObject(errorReason)
      : null;
    return this;
  }

  withProcessedAt(processedAt: string): this {
    this._processedAt = new DateValueObject(new Date(processedAt));
    return this;
  }

  build(): BridgeMessageLogAggregate {
    this.validate();

    return new BridgeMessageLogAggregate(
      new UuidValueObject(this._id),
      {
        direction: this._direction,
        type: this._type,
        nodeId: this._nodeId,
        sourceTopic: this._sourceTopic,
        destinationTopic: this._destinationTopic,
        rawPayload: this._rawPayload,
        outcome: this._outcome,
        errorReason: this._errorReason,
        processedAt: this._processedAt,
      },
      new DateValueObject(this._createdAt),
      new DateValueObject(this._updatedAt),
    );
  }

  buildViewModel(): BridgeMessageLogViewModel {
    const aggregate = this.build();

    return new BridgeMessageLogViewModel(
      aggregate.id.value,
      aggregate.direction.value as BridgeMessageDirectionEnum,
      aggregate.type.value as BridgeMessageTypeEnum,
      aggregate.nodeId?.value ?? null,
      aggregate.sourceTopic.value,
      aggregate.destinationTopic?.value ?? null,
      aggregate.rawPayload.value,
      aggregate.outcome.value as BridgeMessageOutcomeEnum,
      aggregate.errorReason?.value ?? null,
      aggregate.processedAt.toISOString(),
      aggregate.createdAt.value,
      aggregate.updatedAt.value,
    );
  }
}
