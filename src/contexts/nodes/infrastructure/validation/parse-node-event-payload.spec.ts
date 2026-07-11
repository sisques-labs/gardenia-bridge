import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { InvalidMessagePayloadException } from '@contexts/nodes/domain/exceptions/invalid-message-payload.exception';
import {
  extractNodeIdFromTopic,
  parseNodeEventPayload,
  resolveNodeEventType,
} from './parse-node-event-payload';

describe('resolveNodeEventType', () => {
  it('resolves telemetry from a sensors topic', () => {
    expect(resolveNodeEventType('sensors/node-1/soil-moisture/telemetry')).toBe(
      BridgeMessageTypeEnum.TELEMETRY,
    );
  });

  it('resolves heartbeat from a nodes heartbeat topic', () => {
    expect(resolveNodeEventType('nodes/node-1/heartbeat')).toBe(
      BridgeMessageTypeEnum.HEARTBEAT,
    );
  });

  it('resolves command-ack from a nodes commands/ack topic', () => {
    expect(resolveNodeEventType('nodes/node-1/commands/ack')).toBe(
      BridgeMessageTypeEnum.COMMAND_ACK,
    );
  });

  it('returns null for an unrecognized topic', () => {
    expect(resolveNodeEventType('something/else')).toBeNull();
  });
});

describe('extractNodeIdFromTopic', () => {
  it('extracts the nodeId from a telemetry topic', () => {
    expect(
      extractNodeIdFromTopic('sensors/node-42/soil-moisture/telemetry'),
    ).toBe('node-42');
  });

  it('extracts the nodeId from a heartbeat topic', () => {
    expect(extractNodeIdFromTopic('nodes/node-42/heartbeat')).toBe('node-42');
  });

  it('returns null for an unrecognized topic', () => {
    expect(extractNodeIdFromTopic('something/else')).toBeNull();
  });
});

describe('parseNodeEventPayload', () => {
  it('parses and validates a telemetry message', () => {
    const payload = JSON.stringify({
      type: 'telemetry',
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
      sensorType: 'soil-moisture',
      value: 42.5,
    });

    const result = parseNodeEventPayload(
      'sensors/node-1/soil-moisture/telemetry',
      payload,
    );

    expect(result).toMatchObject({
      type: 'telemetry',
      nodeId: 'node-1',
      sensorType: 'soil-moisture',
      value: 42.5,
    });
  });

  it('throws InvalidMessagePayloadException for an unrecognized topic', () => {
    expect(() => parseNodeEventPayload('unknown/topic', '{}')).toThrow(
      InvalidMessagePayloadException,
    );
  });

  it('throws InvalidMessagePayloadException for invalid JSON', () => {
    expect(() =>
      parseNodeEventPayload('nodes/node-1/heartbeat', 'not-json'),
    ).toThrow(InvalidMessagePayloadException);
  });

  it('throws InvalidMessagePayloadException when the schema rejects the payload', () => {
    const payload = JSON.stringify({
      type: 'heartbeat',
      nodeId: 'node-1',
      timestamp: 'not-a-date',
    });

    expect(() =>
      parseNodeEventPayload('nodes/node-1/heartbeat', payload),
    ).toThrow(InvalidMessagePayloadException);
  });

  it('throws when the payload type does not match the topic-resolved type', () => {
    const payload = JSON.stringify({
      type: 'telemetry',
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
      sensorType: 'soil-moisture',
      value: 1,
    });

    expect(() =>
      parseNodeEventPayload('nodes/node-1/heartbeat', payload),
    ).toThrow(InvalidMessagePayloadException);
  });
});
