import { SensorTypeValueObject } from './sensor-type.value-object';

describe('SensorTypeValueObject', () => {
  it('wraps a free-text sensor type', () => {
    expect(new SensorTypeValueObject('soil-moisture').value).toBe(
      'soil-moisture',
    );
  });

  it('throws for an empty string', () => {
    expect(() => new SensorTypeValueObject('')).toThrow();
  });

  it('throws for a value longer than 100 chars', () => {
    expect(() => new SensorTypeValueObject('a'.repeat(101))).toThrow();
  });
});
