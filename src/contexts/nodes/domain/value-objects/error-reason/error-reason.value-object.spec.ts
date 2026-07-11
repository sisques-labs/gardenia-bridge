import { ErrorReasonValueObject } from './error-reason.value-object';

describe('ErrorReasonValueObject', () => {
  it('wraps an error reason string', () => {
    expect(new ErrorReasonValueObject('broker unreachable').value).toBe(
      'broker unreachable',
    );
  });

  it('throws for an empty string', () => {
    expect(() => new ErrorReasonValueObject('')).toThrow();
  });

  it('throws for a reason longer than 2048 chars', () => {
    expect(() => new ErrorReasonValueObject('a'.repeat(2049))).toThrow();
  });
});
