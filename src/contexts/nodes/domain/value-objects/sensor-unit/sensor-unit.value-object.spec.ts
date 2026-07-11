import { SensorUnitValueObject } from './sensor-unit.value-object';

describe('SensorUnitValueObject', () => {
  it('wraps a unit string', () => {
    expect(new SensorUnitValueObject('%').value).toBe('%');
  });

  it('throws for an empty string', () => {
    expect(() => new SensorUnitValueObject('')).toThrow();
  });

  it('throws for a value longer than 20 chars', () => {
    expect(() => new SensorUnitValueObject('a'.repeat(21))).toThrow();
  });
});
