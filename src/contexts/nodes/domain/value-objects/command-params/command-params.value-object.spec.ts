import { CommandParamsValueObject } from './command-params.value-object';

describe('CommandParamsValueObject', () => {
  it('wraps a params object', () => {
    const params = { durationSeconds: 30 };

    expect(new CommandParamsValueObject(params).value).toEqual(params);
  });

  it('allows an empty object', () => {
    expect(() => new CommandParamsValueObject({})).not.toThrow();
  });
});
