import { BridgeMessageTypeEnum } from '../../../domain/enums/bridge-message-type.enum';
import { telemetryMessageSchema } from './telemetry-message.schema';

describe('telemetryMessageSchema', () => {
  const valid = {
    type: BridgeMessageTypeEnum.TELEMETRY,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    sensorType: 'soil-moisture',
    value: 42.5,
    unit: '%',
  };

  it('accepts a valid telemetry payload', () => {
    expect(telemetryMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a payload without the optional unit', () => {
    const { unit: _unit, ...withoutUnit } = valid;
    expect(telemetryMessageSchema.safeParse(withoutUnit).success).toBe(true);
  });

  it('rejects a payload missing value', () => {
    const { value: _value, ...invalid } = valid;
    expect(telemetryMessageSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects a payload with an empty sensorType', () => {
    expect(
      telemetryMessageSchema.safeParse({ ...valid, sensorType: '' }).success,
    ).toBe(false);
  });

  it('rejects a payload with a non-numeric value', () => {
    expect(
      telemetryMessageSchema.safeParse({ ...valid, value: 'not-a-number' })
        .success,
    ).toBe(false);
  });

  it('rejects a mismatched type discriminant', () => {
    expect(
      telemetryMessageSchema.safeParse({
        ...valid,
        type: BridgeMessageTypeEnum.HEARTBEAT,
      }).success,
    ).toBe(false);
  });

  it('rejects an empty nodeId', () => {
    expect(
      telemetryMessageSchema.safeParse({ ...valid, nodeId: '' }).success,
    ).toBe(false);
  });

  it('rejects a non-ISO timestamp', () => {
    expect(
      telemetryMessageSchema.safeParse({ ...valid, timestamp: 'not-a-date' })
        .success,
    ).toBe(false);
  });
});
