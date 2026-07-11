import {
  BaseAggregate,
  DateValueObject,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { BridgeMessageRecordedEvent } from '@contexts/nodes/domain/events/bridge-message-recorded/bridge-message-recorded.event';
import { BridgeMessageDirectionValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-direction/bridge-message-direction.value-object';
import { BridgeMessageOutcomeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-outcome/bridge-message-outcome.value-object';
import { BridgeMessageTypeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-type/bridge-message-type.value-object';
import { ErrorReasonValueObject } from '@contexts/nodes/domain/value-objects/error-reason/error-reason.value-object';
import { NodeIdValueObject } from '@contexts/nodes/domain/value-objects/node-id/node-id.value-object';
import { RawPayloadValueObject } from '@contexts/nodes/domain/value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '@contexts/nodes/domain/value-objects/topic/topic.value-object';
import { IBridgeMessageLog } from '@contexts/nodes/domain/interfaces/bridge-message-log.interface';
import { IBridgeMessageLogPrimitives } from '@contexts/nodes/domain/primitives/bridge-message-log.primitives';

export class BridgeMessageLogAggregate extends BaseAggregate {
  private readonly _id: UuidValueObject;
  private readonly _direction: BridgeMessageDirectionValueObject;
  private readonly _type: BridgeMessageTypeValueObject;
  private readonly _nodeId: NodeIdValueObject | null;
  private readonly _sourceTopic: TopicValueObject;
  private readonly _destinationTopic: TopicValueObject | null;
  private readonly _rawPayload: RawPayloadValueObject;
  private readonly _outcome: BridgeMessageOutcomeValueObject;
  private readonly _errorReason: ErrorReasonValueObject | null;
  private readonly _processedAt: DateValueObject;

  constructor(props: IBridgeMessageLog) {
    super(props.createdAt, props.updatedAt);
    this._id = props.id;
    this._direction = props.direction;
    this._type = props.type;
    this._nodeId = props.nodeId;
    this._sourceTopic = props.sourceTopic;
    this._destinationTopic = props.destinationTopic;
    this._rawPayload = props.rawPayload;
    this._outcome = props.outcome;
    this._errorReason = props.errorReason;
    this._processedAt = props.processedAt;
  }

  get id(): UuidValueObject {
    return this._id;
  }

  get direction(): BridgeMessageDirectionValueObject {
    return this._direction;
  }

  get type(): BridgeMessageTypeValueObject {
    return this._type;
  }

  get nodeId(): NodeIdValueObject | null {
    return this._nodeId;
  }

  get sourceTopic(): TopicValueObject {
    return this._sourceTopic;
  }

  get destinationTopic(): TopicValueObject | null {
    return this._destinationTopic;
  }

  get rawPayload(): RawPayloadValueObject {
    return this._rawPayload;
  }

  get outcome(): BridgeMessageOutcomeValueObject {
    return this._outcome;
  }

  get errorReason(): ErrorReasonValueObject | null {
    return this._errorReason;
  }

  get processedAt(): DateValueObject {
    return this._processedAt;
  }

  /** Emits BridgeMessageRecorded. Append-only — there is no update()/delete(). */
  record(): void {
    this.apply(
      new BridgeMessageRecordedEvent(
        {
          aggregateRootId: this._id.value,
          aggregateRootType: BridgeMessageLogAggregate.name,
          entityId: this._id.value,
          entityType: BridgeMessageLogAggregate.name,
          eventType: BridgeMessageRecordedEvent.name,
        },
        this.toPrimitives(),
      ),
    );
  }

  toPrimitives(): IBridgeMessageLogPrimitives {
    return {
      id: this._id.value,
      direction: this._direction.value as BridgeMessageDirectionEnum,
      type: this._type.value as BridgeMessageTypeEnum,
      nodeId: this._nodeId?.value ?? null,
      sourceTopic: this._sourceTopic.value,
      destinationTopic: this._destinationTopic?.value ?? null,
      rawPayload: this._rawPayload.value,
      outcome: this._outcome.value as BridgeMessageOutcomeEnum,
      errorReason: this._errorReason?.value ?? null,
      processedAt: this._processedAt.toISOString(),
      createdAt: this.createdAt.value,
      updatedAt: this.updatedAt.value,
    };
  }
}
