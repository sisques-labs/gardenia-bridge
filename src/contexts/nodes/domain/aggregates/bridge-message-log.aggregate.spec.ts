import { DateValueObject, UuidValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { BridgeMessageRecordedEvent } from '@contexts/nodes/domain/events/bridge-message-recorded/bridge-message-recorded.event';
import { BridgeMessageDirectionValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-direction/bridge-message-direction.value-object';
import { BridgeMessageOutcomeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-outcome/bridge-message-outcome.value-object';
import { BridgeMessageTypeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-type/bridge-message-type.value-object';
import { NodeIdValueObject } from '@contexts/nodes/domain/value-objects/node-id/node-id.value-object';
import { RawPayloadValueObject } from '@contexts/nodes/domain/value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '@contexts/nodes/domain/value-objects/topic/topic.value-object';
import { BridgeMessageLogAggregate } from './bridge-message-log.aggregate';

const ID = '33333333-3333-4333-8333-333333333333';
const NODE_ID = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-07-10T10:00:00.000Z');

const buildAggregate = (): BridgeMessageLogAggregate =>
  new BridgeMessageLogAggregate(
    new UuidValueObject(ID),
    {
      direction: new BridgeMessageDirectionValueObject(
        BridgeMessageDirectionEnum.INBOUND,
      ),
      type: new BridgeMessageTypeValueObject(BridgeMessageTypeEnum.TELEMETRY),
      nodeId: new NodeIdValueObject(NODE_ID),
      sourceTopic: new TopicValueObject(
        `sensors/${NODE_ID}/soil-moisture/telemetry`,
      ),
      destinationTopic: new TopicValueObject('gardenia-bridge.telemetry'),
      rawPayload: new RawPayloadValueObject('{"value":42.5}'),
      outcome: new BridgeMessageOutcomeValueObject(
        BridgeMessageOutcomeEnum.SUCCESS,
      ),
      errorReason: null,
      processedAt: new DateValueObject(NOW),
    },
    new DateValueObject(NOW),
    new DateValueObject(NOW),
  );

describe('BridgeMessageLogAggregate', () => {
  it('exposes the hydrated fields via getters', () => {
    const aggregate = buildAggregate();

    expect(aggregate.id.value).toBe(ID);
    expect(aggregate.direction.value).toBe(BridgeMessageDirectionEnum.INBOUND);
    expect(aggregate.type.value).toBe(BridgeMessageTypeEnum.TELEMETRY);
    expect(aggregate.nodeId?.value).toBe(NODE_ID);
    expect(aggregate.sourceTopic.value).toBe(
      `sensors/${NODE_ID}/soil-moisture/telemetry`,
    );
    expect(aggregate.destinationTopic?.value).toBe('gardenia-bridge.telemetry');
    expect(aggregate.rawPayload.value).toBe('{"value":42.5}');
    expect(aggregate.outcome.value).toBe(BridgeMessageOutcomeEnum.SUCCESS);
    expect(aggregate.errorReason).toBeNull();
  });

  it('constructor does not emit any events (hydration only)', () => {
    const aggregate = buildAggregate();

    expect(aggregate.getUncommittedEvents()).toHaveLength(0);
  });

  describe('record()', () => {
    it('emits a single BridgeMessageRecordedEvent', () => {
      const aggregate = buildAggregate();

      aggregate.record();

      const events = aggregate.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(BridgeMessageRecordedEvent);
    });

    it('carries the aggregate fields in the event payload', () => {
      const aggregate = buildAggregate();

      aggregate.record();

      const event =
        aggregate.getUncommittedEvents()[0] as BridgeMessageRecordedEvent;
      expect(event.data).toMatchObject({
        direction: BridgeMessageDirectionEnum.INBOUND,
        type: BridgeMessageTypeEnum.TELEMETRY,
        nodeId: NODE_ID,
        outcome: BridgeMessageOutcomeEnum.SUCCESS,
        errorReason: null,
      });
    });
  });

  describe('toPrimitives()', () => {
    it('serializes every field to its primitive shape', () => {
      const aggregate = buildAggregate();

      expect(aggregate.toPrimitives()).toEqual({
        id: ID,
        direction: BridgeMessageDirectionEnum.INBOUND,
        type: BridgeMessageTypeEnum.TELEMETRY,
        nodeId: NODE_ID,
        sourceTopic: `sensors/${NODE_ID}/soil-moisture/telemetry`,
        destinationTopic: 'gardenia-bridge.telemetry',
        rawPayload: '{"value":42.5}',
        outcome: BridgeMessageOutcomeEnum.SUCCESS,
        errorReason: null,
        processedAt: NOW.toISOString(),
        createdAt: NOW,
        updatedAt: NOW,
      });
    });
  });
});
