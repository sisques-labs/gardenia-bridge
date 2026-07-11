import { InvalidMessagePayloadException } from '@contexts/nodes/domain/exceptions/invalid-message-payload.exception';
import { parseCommandPayload } from './parse-command-payload';

describe('parseCommandPayload', () => {
  it('parses and validates a command message', () => {
    const payload = JSON.stringify({
      type: 'command',
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
      commandId: 'cmd-1',
      action: 'open-valve',
      params: { durationSeconds: 30 },
    });

    const result = parseCommandPayload('gardenia-bridge.commands', payload);

    expect(result).toMatchObject({
      type: 'command',
      nodeId: 'node-1',
      commandId: 'cmd-1',
      action: 'open-valve',
    });
  });

  it('throws InvalidMessagePayloadException for invalid JSON', () => {
    expect(() =>
      parseCommandPayload('gardenia-bridge.commands', 'not-json'),
    ).toThrow(InvalidMessagePayloadException);
  });

  it('throws InvalidMessagePayloadException when required fields are missing', () => {
    const payload = JSON.stringify({
      type: 'command',
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
    });

    expect(() =>
      parseCommandPayload('gardenia-bridge.commands', payload),
    ).toThrow(InvalidMessagePayloadException);
  });

  it('throws InvalidMessagePayloadException for a wrong type discriminant', () => {
    const payload = JSON.stringify({
      type: 'telemetry',
      nodeId: 'node-1',
      timestamp: '2026-07-10T10:00:00Z',
      sensorType: 'soil-moisture',
      value: 1,
    });

    expect(() =>
      parseCommandPayload('gardenia-bridge.commands', payload),
    ).toThrow(InvalidMessagePayloadException);
  });
});
