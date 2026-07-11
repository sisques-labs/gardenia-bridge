import {
  FieldIsRequiredException,
  UuidValueObject,
} from '@sisques-labs/nestjs-kit';

import { BridgeMessageLogAggregate } from '../aggregates/bridge-message-log.aggregate';
import { BridgeMessageDirectionEnum } from '../enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '../enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { BridgeMessageLogViewModel } from '../view-models/bridge-message-log.view-model';
import { BridgeMessageLogBuilder } from './bridge-message-log.builder';

const ID = '33333333-3333-4333-8333-333333333333';
const NODE_ID = '11111111-1111-4111-8111-111111111111';
const SOURCE_TOPIC = `sensors/${NODE_ID}/soil-moisture/telemetry`;
const NOW = new Date('2026-07-10T10:00:00.000Z');

const buildFull = (builder: BridgeMessageLogBuilder) =>
  builder
    .withId(ID)
    .withCreatedAt(NOW)
    .withUpdatedAt(NOW)
    .withDirection(BridgeMessageDirectionEnum.INBOUND)
    .withType(BridgeMessageTypeEnum.TELEMETRY)
    .withNodeId(NODE_ID)
    .withSourceTopic(SOURCE_TOPIC)
    .withDestinationTopic('gardenia-bridge.telemetry')
    .withRawPayload('{"value":42.5}')
    .withOutcome(BridgeMessageOutcomeEnum.SUCCESS)
    .withProcessedAt(NOW.toISOString());

describe('BridgeMessageLogBuilder', () => {
  let builder: BridgeMessageLogBuilder;

  beforeEach(() => {
    builder = new BridgeMessageLogBuilder();
  });

  describe('build()', () => {
    it('returns a BridgeMessageLogAggregate with the provided values', () => {
      const aggregate = buildFull(builder).build();

      expect(aggregate).toBeInstanceOf(BridgeMessageLogAggregate);
      expect(aggregate.id.value).toBe(ID);
      expect(aggregate.direction.value).toBe(
        BridgeMessageDirectionEnum.INBOUND,
      );
      expect(aggregate.type.value).toBe(BridgeMessageTypeEnum.TELEMETRY);
      expect(aggregate.nodeId?.value).toBe(NODE_ID);
      expect(aggregate.outcome.value).toBe(BridgeMessageOutcomeEnum.SUCCESS);
    });

    it('throws FieldIsRequiredException when id is missing', () => {
      builder
        .withCreatedAt(NOW)
        .withUpdatedAt(NOW)
        .withDirection(BridgeMessageDirectionEnum.INBOUND)
        .withType(BridgeMessageTypeEnum.TELEMETRY)
        .withSourceTopic(SOURCE_TOPIC)
        .withRawPayload('{}')
        .withOutcome(BridgeMessageOutcomeEnum.SUCCESS)
        .withProcessedAt(NOW.toISOString());

      expect(() => builder.build()).toThrow(FieldIsRequiredException);
    });

    it('accepts a null nodeId (e.g. an outbound command discard with no resolved node)', () => {
      const aggregate = buildFull(builder).withNodeId(null).build();

      expect(aggregate.nodeId).toBeNull();
    });

    it('accepts a null destinationTopic (e.g. a forwarding failure)', () => {
      const aggregate = buildFull(builder).withDestinationTopic(null).build();

      expect(aggregate.destinationTopic).toBeNull();
    });

    it('accepts a null errorReason by default', () => {
      const aggregate = buildFull(builder).build();

      expect(aggregate.errorReason).toBeNull();
    });

    it('wraps a provided errorReason', () => {
      const aggregate = buildFull(builder)
        .withOutcome(BridgeMessageOutcomeEnum.ERROR)
        .withErrorReason('broker unreachable')
        .build();

      expect(aggregate.errorReason?.value).toBe('broker unreachable');
    });

    it('uses a freshly generated uuid when the caller supplies one explicitly', () => {
      const generated = UuidValueObject.generate().value;
      const aggregate = buildFull(builder).withId(generated).build();

      expect(aggregate.id.value).toBe(generated);
    });
  });

  describe('buildViewModel()', () => {
    it('returns a BridgeMessageLogViewModel with the provided values', () => {
      const vm = buildFull(builder).buildViewModel();

      expect(vm).toBeInstanceOf(BridgeMessageLogViewModel);
      expect(vm.id).toBe(ID);
      expect(vm.nodeId).toBe(NODE_ID);
      expect(vm.outcome).toBe(BridgeMessageOutcomeEnum.SUCCESS);
    });
  });
});
