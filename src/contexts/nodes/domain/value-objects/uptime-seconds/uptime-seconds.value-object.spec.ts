import { UptimeSecondsValueObject } from './uptime-seconds.value-object';

describe('UptimeSecondsValueObject', () => {
  it('wraps a positive integer', () => {
    expect(new UptimeSecondsValueObject(120).value).toBe(120);
  });

  it('accepts zero', () => {
    expect(new UptimeSecondsValueObject(0).value).toBe(0);
  });

  it('throws for a negative value', () => {
    expect(() => new UptimeSecondsValueObject(-1)).toThrow();
  });

  it('throws for a decimal value', () => {
    expect(() => new UptimeSecondsValueObject(1.5)).toThrow();
  });
});
