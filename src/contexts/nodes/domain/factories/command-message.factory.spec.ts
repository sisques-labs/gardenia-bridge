import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { ICommandMessagePrimitives } from '@contexts/nodes/domain/primitives/command-message.primitives';
import {
  buildCommandMessage,
  commandMessageToPrimitives,
} from './command-message.factory';

const NODE_ID = '11111111-1111-4111-8111-111111111111';
const COMMAND_ID = '22222222-2222-4222-8222-222222222222';
const TIMESTAMP = '2026-07-10T10:00:00.000Z';

describe('command-message.factory', () => {
  describe('buildCommandMessage()', () => {
    const primitives: ICommandMessagePrimitives = {
      type: BridgeMessageTypeEnum.COMMAND,
      nodeId: NODE_ID,
      timestamp: TIMESTAMP,
      commandId: COMMAND_ID,
      action: 'open-valve',
      params: { durationSeconds: 30 },
    };

    it('wraps every field into its value object', () => {
      const message = buildCommandMessage(primitives);

      expect(message.type.value).toBe(BridgeMessageTypeEnum.COMMAND);
      expect(message.nodeId.value).toBe(NODE_ID);
      expect(message.timestamp.toISOString()).toBe(TIMESTAMP);
      expect(message.commandId.value).toBe(COMMAND_ID);
      expect(message.action.value).toBe('open-valve');
      expect(message.params?.value).toEqual({ durationSeconds: 30 });
    });

    it('leaves params undefined when not provided', () => {
      const message = buildCommandMessage({
        type: BridgeMessageTypeEnum.COMMAND,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        commandId: COMMAND_ID,
        action: 'close-valve',
      });

      expect(message.params).toBeUndefined();
    });
  });

  describe('commandMessageToPrimitives()', () => {
    it('round-trips a command message back to primitives', () => {
      const primitives: ICommandMessagePrimitives = {
        type: BridgeMessageTypeEnum.COMMAND,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        commandId: COMMAND_ID,
        action: 'open-valve',
        params: { durationSeconds: 30 },
      };

      const roundTripped = commandMessageToPrimitives(
        buildCommandMessage(primitives),
      );

      expect(roundTripped).toEqual(primitives);
    });

    it('omits params when not present on the message', () => {
      const message = buildCommandMessage({
        type: BridgeMessageTypeEnum.COMMAND,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        commandId: COMMAND_ID,
        action: 'close-valve',
      });

      expect(commandMessageToPrimitives(message).params).toBeUndefined();
    });
  });
});
