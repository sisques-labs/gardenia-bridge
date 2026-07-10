import { sentryConfig } from './sentry.config';

describe('sentryConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('marks Sentry as disabled when SENTRY_DSN is unset', () => {
    delete process.env.SENTRY_DSN;

    const config = sentryConfig();

    expect(config.enabled).toBe(false);
    expect(config.dsn).toBeUndefined();
  });

  it('exposes Sentry settings when SENTRY_DSN is set', () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    process.env.SENTRY_ENVIRONMENT = 'test';
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';

    const config = sentryConfig();

    expect(config).toEqual({
      enabled: true,
      dsn: 'https://example@o0.ingest.sentry.io/0',
      environment: 'test',
      release: undefined,
      tracesSampleRate: 0.5,
      profileSessionSampleRate: 1,
    });
  });
});
