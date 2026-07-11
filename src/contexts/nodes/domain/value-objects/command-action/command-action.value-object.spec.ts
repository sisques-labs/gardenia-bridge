import { CommandActionValueObject } from './command-action.value-object';

describe('CommandActionValueObject', () => {
  it('wraps an action string', () => {
    expect(new CommandActionValueObject('open-valve').value).toBe('open-valve');
  });

  it('throws for an empty string', () => {
    expect(() => new CommandActionValueObject('')).toThrow();
  });

  it('throws for a value longer than 100 chars', () => {
    expect(() => new CommandActionValueObject('a'.repeat(101))).toThrow();
  });
});
