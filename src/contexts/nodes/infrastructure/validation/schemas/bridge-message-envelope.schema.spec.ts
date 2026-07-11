import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { bridgeMessageEnvelopeSchema } from './bridge-message-envelope.schema';

describe('bridgeMessageEnvelopeSchema', () => {
  const valid = {
    type: BridgeMessageTypeEnum.TELEMETRY,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
  };

  it('accepts a valid envelope', () => {
    expect(bridgeMessageEnvelopeSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts an offset timestamp', () => {
    expect(
      bridgeMessageEnvelopeSchema.safeParse({
        ...valid,
        timestamp: '2026-07-10T10:00:00+02:00',
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown type value', () => {
    expect(
      bridgeMessageEnvelopeSchema.safeParse({ ...valid, type: 'unknown-type' })
        .success,
    ).toBe(false);
  });

  it('rejects a blank nodeId', () => {
    expect(
      bridgeMessageEnvelopeSchema.safeParse({ ...valid, nodeId: '   ' })
        .success,
    ).toBe(false);
  });
});
