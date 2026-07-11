import { SensorValueValueObject } from './sensor-value.value-object';

describe('SensorValueValueObject', () => {
  it('wraps an integer reading', () => {
    expect(new SensorValueValueObject(42).value).toBe(42);
  });

  it('wraps a decimal reading', () => {
    expect(new SensorValueValueObject(42.5).value).toBe(42.5);
  });

  it('accepts negative values', () => {
    expect(new SensorValueValueObject(-5.2).value).toBe(-5.2);
  });

  it('throws for a non-finite value', () => {
    expect(() => new SensorValueValueObject(Infinity)).toThrow();
  });
});
