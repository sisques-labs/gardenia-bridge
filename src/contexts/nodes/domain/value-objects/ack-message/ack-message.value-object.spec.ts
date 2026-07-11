import { AckMessageValueObject } from './ack-message.value-object';

describe('AckMessageValueObject', () => {
  it('wraps an ack message string', () => {
    expect(new AckMessageValueObject('valve opened').value).toBe(
      'valve opened',
    );
  });

  it('throws for an empty string', () => {
    expect(() => new AckMessageValueObject('')).toThrow();
  });

  it('throws for a value longer than 1024 chars', () => {
    expect(() => new AckMessageValueObject('a'.repeat(1025))).toThrow();
  });
});
