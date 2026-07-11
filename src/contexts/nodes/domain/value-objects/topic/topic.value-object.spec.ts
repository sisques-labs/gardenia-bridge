import { TopicValueObject } from './topic.value-object';

describe('TopicValueObject', () => {
  it('wraps a valid topic string', () => {
    expect(
      new TopicValueObject('sensors/node-1/soil-moisture/telemetry').value,
    ).toBe('sensors/node-1/soil-moisture/telemetry');
  });

  it('throws for an empty string', () => {
    expect(() => new TopicValueObject('')).toThrow();
  });

  it('accepts a topic of exactly 512 chars', () => {
    const topic = 'a'.repeat(512);

    expect(() => new TopicValueObject(topic)).not.toThrow();
  });

  it('throws for a topic longer than 512 chars', () => {
    const topic = 'a'.repeat(513);

    expect(() => new TopicValueObject(topic)).toThrow();
  });
});
