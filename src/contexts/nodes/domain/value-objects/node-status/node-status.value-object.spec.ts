import { NodeStatusValueObject } from './node-status.value-object';

describe('NodeStatusValueObject', () => {
  it('wraps a status string', () => {
    expect(new NodeStatusValueObject('online').value).toBe('online');
  });

  it('throws for an empty string', () => {
    expect(() => new NodeStatusValueObject('')).toThrow();
  });

  it('throws for a value longer than 100 chars', () => {
    expect(() => new NodeStatusValueObject('a'.repeat(101))).toThrow();
  });
});
