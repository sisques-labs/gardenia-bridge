import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { InvalidMessagePayloadException } from '@contexts/nodes/domain/exceptions/invalid-message-payload.exception';
import { ICommandAckMessagePrimitives } from '@contexts/nodes/domain/primitives/command-ack-message.primitives';
import { IHeartbeatMessagePrimitives } from '@contexts/nodes/domain/primitives/heartbeat-message.primitives';
import { ITelemetryMessagePrimitives } from '@contexts/nodes/domain/primitives/telemetry-message.primitives';
import {
  buildCommandAckMessage,
  buildHeartbeatMessage,
  buildNodeEventMessage,
  buildTelemetryMessage,
  nodeEventMessageToPrimitives,
} from './node-event-message.factory';

const NODE_ID = '11111111-1111-4111-8111-111111111111';
const COMMAND_ID = '22222222-2222-4222-8222-222222222222';
const TIMESTAMP = '2026-07-10T10:00:00.000Z';

describe('node-event-message.factory', () => {
  describe('buildTelemetryMessage()', () => {
    const primitives: ITelemetryMessagePrimitives = {
      type: BridgeMessageTypeEnum.TELEMETRY,
      nodeId: NODE_ID,
      timestamp: TIMESTAMP,
      sensorType: 'soil-moisture',
      value: 42.5,
      unit: '%',
    };

    it('wraps every field into its value object', () => {
      const message = buildTelemetryMessage(primitives);

      expect(message.type.value).toBe(BridgeMessageTypeEnum.TELEMETRY);
      expect(message.nodeId.value).toBe(NODE_ID);
      expect(message.timestamp.toISOString()).toBe(TIMESTAMP);
      expect(message.sensorType.value).toBe('soil-moisture');
      expect(message.value.value).toBe(42.5);
      expect(message.unit?.value).toBe('%');
    });

    it('leaves unit undefined when not provided', () => {
      const message = buildTelemetryMessage({ ...primitives, unit: undefined });

      expect(message.unit).toBeUndefined();
    });
  });

  describe('buildHeartbeatMessage()', () => {
    const primitives: IHeartbeatMessagePrimitives = {
      type: BridgeMessageTypeEnum.HEARTBEAT,
      nodeId: NODE_ID,
      timestamp: TIMESTAMP,
      status: 'online',
      uptimeSeconds: 120,
    };

    it('wraps every field into its value object', () => {
      const message = buildHeartbeatMessage(primitives);

      expect(message.status?.value).toBe('online');
      expect(message.uptimeSeconds?.value).toBe(120);
    });

    it('leaves optional fields undefined when not provided', () => {
      const message = buildHeartbeatMessage({
        type: BridgeMessageTypeEnum.HEARTBEAT,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
      });

      expect(message.status).toBeUndefined();
      expect(message.uptimeSeconds).toBeUndefined();
    });
  });

  describe('buildCommandAckMessage()', () => {
    const primitives: ICommandAckMessagePrimitives = {
      type: BridgeMessageTypeEnum.COMMAND_ACK,
      nodeId: NODE_ID,
      timestamp: TIMESTAMP,
      commandId: COMMAND_ID,
      success: true,
      message: 'valve opened',
    };

    it('wraps every field into its value object', () => {
      const message = buildCommandAckMessage(primitives);

      expect(message.commandId.value).toBe(COMMAND_ID);
      expect(message.success.value).toBe(true);
      expect(message.message?.value).toBe('valve opened');
    });
  });

  describe('buildNodeEventMessage()', () => {
    it('dispatches to buildTelemetryMessage for type=telemetry', () => {
      const message = buildNodeEventMessage({
        type: BridgeMessageTypeEnum.TELEMETRY,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        sensorType: 'soil-moisture',
        value: 42.5,
      });

      expect(message.type.value).toBe(BridgeMessageTypeEnum.TELEMETRY);
    });

    it('dispatches to buildHeartbeatMessage for type=heartbeat', () => {
      const message = buildNodeEventMessage({
        type: BridgeMessageTypeEnum.HEARTBEAT,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
      });

      expect(message.type.value).toBe(BridgeMessageTypeEnum.HEARTBEAT);
    });

    it('dispatches to buildCommandAckMessage for type=command-ack', () => {
      const message = buildNodeEventMessage({
        type: BridgeMessageTypeEnum.COMMAND_ACK,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        commandId: COMMAND_ID,
        success: false,
      });

      expect(message.type.value).toBe(BridgeMessageTypeEnum.COMMAND_ACK);
    });

    it('throws InvalidMessagePayloadException for an unsupported type', () => {
      expect(() =>
        buildNodeEventMessage({
          type: BridgeMessageTypeEnum.COMMAND,
          nodeId: NODE_ID,
          timestamp: TIMESTAMP,
        } as unknown as ITelemetryMessagePrimitives),
      ).toThrow(InvalidMessagePayloadException);
    });
  });

  describe('nodeEventMessageToPrimitives()', () => {
    it('round-trips a telemetry message back to primitives', () => {
      const primitives: ITelemetryMessagePrimitives = {
        type: BridgeMessageTypeEnum.TELEMETRY,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        sensorType: 'soil-moisture',
        value: 42.5,
        unit: '%',
      };

      const roundTripped = nodeEventMessageToPrimitives(
        buildTelemetryMessage(primitives),
      );

      expect(roundTripped).toEqual(primitives);
    });

    it('round-trips a heartbeat message back to primitives', () => {
      const primitives: IHeartbeatMessagePrimitives = {
        type: BridgeMessageTypeEnum.HEARTBEAT,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        status: 'online',
        uptimeSeconds: 120,
      };

      const roundTripped = nodeEventMessageToPrimitives(
        buildHeartbeatMessage(primitives),
      );

      expect(roundTripped).toEqual(primitives);
    });

    it('round-trips a command-ack message back to primitives', () => {
      const primitives: ICommandAckMessagePrimitives = {
        type: BridgeMessageTypeEnum.COMMAND_ACK,
        nodeId: NODE_ID,
        timestamp: TIMESTAMP,
        commandId: COMMAND_ID,
        success: true,
        message: 'valve opened',
      };

      const roundTripped = nodeEventMessageToPrimitives(
        buildCommandAckMessage(primitives),
      );

      expect(roundTripped).toEqual(primitives);
    });
  });
});
