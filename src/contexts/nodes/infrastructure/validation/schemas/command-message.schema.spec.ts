import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { commandMessageSchema } from './command-message.schema';

describe('commandMessageSchema', () => {
  const valid = {
    type: BridgeMessageTypeEnum.COMMAND,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    commandId: 'cmd-1',
    action: 'open-valve',
    params: { durationSeconds: 30 },
  };

  it('accepts a valid command payload', () => {
    expect(commandMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a command without params', () => {
    const { params: _params, ...withoutParams } = valid;
    expect(commandMessageSchema.safeParse(withoutParams).success).toBe(true);
  });

  it('rejects a command missing commandId', () => {
    const { commandId: _commandId, ...invalid } = valid;
    expect(commandMessageSchema.safeParse(invalid).success).toBe(false);
  });

  it('rejects a command with an empty action', () => {
    expect(
      commandMessageSchema.safeParse({ ...valid, action: '' }).success,
    ).toBe(false);
  });

  it('does not validate the shape of params (opaque object)', () => {
    expect(
      commandMessageSchema.safeParse({
        ...valid,
        params: { anything: 'goes', nested: { too: true } },
      }).success,
    ).toBe(true);
  });
});
