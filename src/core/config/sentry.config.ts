import { registerAs } from '@nestjs/config';

function parseSampleRate(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error(
      `Invalid Sentry sample rate "${value}": expected a number between 0 and 1`,
    );
  }

  return parsed;
}

export const sentryConfig = registerAs('sentry', () => {
  const dsn = process.env.SENTRY_DSN?.trim() || undefined;

  return {
    enabled: Boolean(dsn),
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE?.trim() || undefined,
    tracesSampleRate: parseSampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 1),
    profileSessionSampleRate: parseSampleRate(
      process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE,
      1,
    ),
  };
});
