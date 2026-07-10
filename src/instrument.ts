import { config as loadEnv } from 'dotenv';

import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

loadEnv({ quiet: true });

const dsn = process.env.SENTRY_DSN?.trim();

if (dsn) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    release: process.env.SENTRY_RELEASE,
    integrations: [nodeProfilingIntegration()],
    enableLogs: true,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 1),
    profileSessionSampleRate: Number(
      process.env.SENTRY_PROFILE_SESSION_SAMPLE_RATE ?? 1,
    ),
    profileLifecycle: 'trace',
  });
}
