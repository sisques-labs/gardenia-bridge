import { BridgeMessageTypeEnum } from '../../../domain/enums/bridge-message-type.enum';
import { heartbeatMessageSchema } from './heartbeat-message.schema';

describe('heartbeatMessageSchema', () => {
  const valid = {
    type: BridgeMessageTypeEnum.HEARTBEAT,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    status: 'ok',
    uptimeSeconds: 3600,
  };

  it('accepts a valid heartbeat payload', () => {
    expect(heartbeatMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts the minimal envelope with no optional fields', () => {
    const minimal = {
      type: BridgeMessageTypeEnum.HEARTBEAT,
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
    };
    expect(heartbeatMessageSchema.safeParse(minimal).success).toBe(true);
  });

  it('rejects a negative uptimeSeconds', () => {
    expect(
      heartbeatMessageSchema.safeParse({ ...valid, uptimeSeconds: -1 }).success,
    ).toBe(false);
  });

  it('rejects a mismatched type discriminant', () => {
    expect(
      heartbeatMessageSchema.safeParse({
        ...valid,
        type: BridgeMessageTypeEnum.TELEMETRY,
      }).success,
    ).toBe(false);
  });
});
