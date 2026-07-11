import { CommandIdValueObject } from './command-id.value-object';

const VALID_UUID = '22222222-2222-4222-8222-222222222222';

describe('CommandIdValueObject', () => {
  it('accepts a valid UUID', () => {
    expect(new CommandIdValueObject(VALID_UUID).value).toBe(VALID_UUID);
  });

  it('throws for an invalid UUID', () => {
    expect(() => new CommandIdValueObject('cmd-1')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => new CommandIdValueObject('')).toThrow();
  });
});
