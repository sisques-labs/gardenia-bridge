import { kafkaConfig } from './kafka.config';

describe('kafkaConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
    delete process.env.KAFKA_ENABLED;
    delete process.env.KAFKA_BROKERS;
    delete process.env.KAFKA_CLIENT_ID;
    delete process.env.KAFKA_TOPIC_PREFIX;
    delete process.env.KAFKA_SSL;
    delete process.env.KAFKA_SASL_MECHANISM;
    delete process.env.KAFKA_SASL_USERNAME;
    delete process.env.KAFKA_SASL_PASSWORD;
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  it('defaults to disabled with sensible defaults', () => {
    const config = kafkaConfig();

    expect(config).toEqual({
      enabled: false,
      clientId: 'nestjs-template',
      brokers: [],
      topicPrefix: 'nestjs-template',
      ssl: false,
      sasl: null,
    });
  });

  it('parses a comma-separated broker list trimming blanks', () => {
    process.env.KAFKA_BROKERS = ' a:9092 , b:9092 ,, ';

    expect(kafkaConfig().brokers).toEqual(['a:9092', 'b:9092']);
  });

  it('enables only when KAFKA_ENABLED is exactly "true"', () => {
    process.env.KAFKA_ENABLED = 'true';
    expect(kafkaConfig().enabled).toBe(true);

    process.env.KAFKA_ENABLED = 'TRUE';
    expect(kafkaConfig().enabled).toBe(false);
  });

  it('builds SASL config only when username and password are present', () => {
    expect(kafkaConfig().sasl).toBeNull();

    process.env.KAFKA_SASL_USERNAME = 'user';
    process.env.KAFKA_SASL_PASSWORD = 'pass';
    process.env.KAFKA_SASL_MECHANISM = 'scram-sha-256';

    expect(kafkaConfig().sasl).toEqual({
      mechanism: 'scram-sha-256',
      username: 'user',
      password: 'pass',
    });
  });

  it('defaults the SASL mechanism to plain', () => {
    process.env.KAFKA_SASL_USERNAME = 'user';
    process.env.KAFKA_SASL_PASSWORD = 'pass';

    expect(kafkaConfig().sasl?.mechanism).toBe('plain');
  });
});
