import { registerAs } from '@nestjs/config';

import { resolveCorsOrigins } from './cors-origins';

export const appConfig = registerAs('app', () => ({
  name: process.env.SERVICE_NAME?.trim() || 'nestjs-template',
  nodeEnv: process.env.NODE_ENV ?? 'development',
  frontendUrl: (process.env.FRONTEND_URL ?? 'http://localhost:3001').replace(
    /\/$/,
    '',
  ),
  corsOrigins: resolveCorsOrigins({
    CORS_ORIGINS: process.env.CORS_ORIGINS,
    FRONTEND_URL: process.env.FRONTEND_URL,
    NODE_ENV: process.env.NODE_ENV,
  }),
}));
