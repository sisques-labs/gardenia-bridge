import { RawPayloadValueObject } from './raw-payload.value-object';

describe('RawPayloadValueObject', () => {
  it('wraps a raw JSON payload string', () => {
    const payload = '{"value":42.5}';

    expect(new RawPayloadValueObject(payload).value).toBe(payload);
  });

  it('allows an empty string (malformed payloads must still be auditable)', () => {
    expect(() => new RawPayloadValueObject('')).not.toThrow();
  });

  it('allows a non-JSON string', () => {
    expect(new RawPayloadValueObject('not-json').value).toBe('not-json');
  });

  it('throws for a payload longer than 65536 chars', () => {
    const payload = 'a'.repeat(65537);

    expect(() => new RawPayloadValueObject(payload)).toThrow();
  });
});
