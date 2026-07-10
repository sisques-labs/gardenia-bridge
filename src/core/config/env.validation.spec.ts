import { validateEnv } from './env.validation';

function validEnv(
  overrides: Record<string, string | undefined> = {},
): Record<string, string> {
  return {
    NODE_ENV: 'development',
    DATABASE_DRIVER: 'postgres',
    DATABASE_HOST: 'localhost',
    DATABASE_PORT: '5432',
    DATABASE_USERNAME: 'postgres',
    DATABASE_PASSWORD: 'secret',
    DATABASE_DATABASE: 'nestjs_template_db',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('accepts a complete non-production environment', () => {
    expect(() => validateEnv(validEnv())).not.toThrow();
  });

  it('rejects missing DATABASE_HOST', () => {
    const env = validEnv({ DATABASE_HOST: '' });

    expect(() => validateEnv(env)).toThrow(
      /Environment validation failed:[\s\S]*DATABASE_HOST/,
    );
  });

  it('rejects missing DATABASE_USERNAME', () => {
    const env = validEnv({ DATABASE_USERNAME: '' });

    expect(() => validateEnv(env)).toThrow(
      /Environment validation failed:[\s\S]*DATABASE_USERNAME/,
    );
  });

  it('rejects KAFKA_ENABLED=true without KAFKA_BROKERS', () => {
    const env = validEnv({ KAFKA_ENABLED: 'true' });

    expect(() => validateEnv(env)).toThrow(
      /KAFKA_BROKERS is required when KAFKA_ENABLED is "true"/,
    );
  });

  it('accepts KAFKA_ENABLED=true with KAFKA_BROKERS set', () => {
    const env = validEnv({
      KAFKA_ENABLED: 'true',
      KAFKA_BROKERS: 'localhost:9092',
    });

    expect(() => validateEnv(env)).not.toThrow();
  });

  it('rejects missing CORS origins in production', () => {
    const env = validEnv({ NODE_ENV: 'production' });

    expect(() => validateEnv(env)).toThrow(
      /CORS_ORIGINS or FRONTEND_URL: at least one origin must be configured in production/,
    );
  });

  it('accepts FRONTEND_URL as CORS origin in production', () => {
    const env = validEnv({
      NODE_ENV: 'production',
      FRONTEND_URL: 'https://app.example.com',
    });

    expect(() => validateEnv(env)).not.toThrow();
  });
});
