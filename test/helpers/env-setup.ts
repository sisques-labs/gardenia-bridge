/**
 * Sets up environment variables for E2E/integration tests before any module is
 * loaded. These match the values in docker-compose.test.yml.
 */

import { existsSync, readFileSync } from 'fs';

import { TESTCONTAINERS_ENV_FILE } from './testcontainers-env';

if (
  process.env.USE_TESTCONTAINERS === '1' &&
  existsSync(TESTCONTAINERS_ENV_FILE)
) {
  const testcontainersEnv = JSON.parse(
    readFileSync(TESTCONTAINERS_ENV_FILE, 'utf8'),
  ) as { DATABASE_HOST: string; DATABASE_PORT: string };

  process.env.DATABASE_HOST = testcontainersEnv.DATABASE_HOST;
  process.env.DATABASE_PORT = testcontainersEnv.DATABASE_PORT;
}

process.env.DATABASE_DRIVER = process.env.DATABASE_DRIVER ?? 'postgres';
process.env.DATABASE_HOST = process.env.DATABASE_HOST ?? 'localhost';
process.env.DATABASE_PORT = process.env.DATABASE_PORT ?? '5433';
process.env.DATABASE_USERNAME = process.env.DATABASE_USERNAME ?? 'postgres';
process.env.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? 'postgres';
process.env.DATABASE_DATABASE =
  process.env.DATABASE_DATABASE ?? 'nestjs_template_test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:3001';
process.env.NODE_ENV = 'test';
