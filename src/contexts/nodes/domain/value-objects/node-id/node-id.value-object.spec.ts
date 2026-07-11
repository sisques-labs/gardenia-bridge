import { NodeIdValueObject } from './node-id.value-object';

const VALID_UUID = '11111111-1111-4111-8111-111111111111';

describe('NodeIdValueObject', () => {
  it('accepts a valid UUID', () => {
    expect(new NodeIdValueObject(VALID_UUID).value).toBe(VALID_UUID);
  });

  it('throws for an invalid UUID', () => {
    expect(() => new NodeIdValueObject('node-1')).toThrow();
  });

  it('throws for an empty string', () => {
    expect(() => new NodeIdValueObject('')).toThrow();
  });

  it('supports equality comparison', () => {
    const a = new NodeIdValueObject(VALID_UUID);
    const b = new NodeIdValueObject(VALID_UUID);

    expect(a.equals(b)).toBe(true);
  });
});
