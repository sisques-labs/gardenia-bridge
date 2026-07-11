import { CommandSuccessValueObject } from './command-success.value-object';

describe('CommandSuccessValueObject', () => {
  it('wraps true', () => {
    expect(new CommandSuccessValueObject(true).value).toBe(true);
  });

  it('wraps false', () => {
    expect(new CommandSuccessValueObject(false).value).toBe(false);
  });
});
