import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { commandAckMessageSchema } from './command-ack-message.schema';

describe('commandAckMessageSchema', () => {
  const valid = {
    type: BridgeMessageTypeEnum.COMMAND_ACK,
    nodeId: 'node-1',
    timestamp: '2026-07-10T10:00:00Z',
    commandId: 'cmd-1',
    success: true,
    message: 'valve opened',
  };

  it('accepts a valid command-ack payload', () => {
    expect(commandAckMessageSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts a failure ack without a message', () => {
    const { message: _message, ...withoutMessage } = valid;
    expect(
      commandAckMessageSchema.safeParse({ ...withoutMessage, success: false })
        .success,
    ).toBe(true);
  });

  it('rejects a non-boolean success field', () => {
    expect(
      commandAckMessageSchema.safeParse({ ...valid, success: 'yes' }).success,
    ).toBe(false);
  });

  it('rejects a payload missing commandId', () => {
    const { commandId: _commandId, ...invalid } = valid;
    expect(commandAckMessageSchema.safeParse(invalid).success).toBe(false);
  });
});
