import { unlinkSync, writeFileSync } from 'fs';

import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';

import { TESTCONTAINERS_ENV_FILE } from './helpers/testcontainers-env';

export { TESTCONTAINERS_ENV_FILE };

export default async function globalSetup(): Promise<
  (() => Promise<void>) | void
> {
  if (process.env.USE_TESTCONTAINERS !== '1') {
    return;
  }

  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:16-alpine',
  )
    .withDatabase('nestjs_template_test')
    .withUsername('postgres')
    .withPassword('postgres')
    .start();

  writeFileSync(
    TESTCONTAINERS_ENV_FILE,
    JSON.stringify({
      DATABASE_HOST: container.getHost(),
      DATABASE_PORT: String(container.getFirstMappedPort()),
    }),
  );

  return async () => {
    await container.stop();
    try {
      unlinkSync(TESTCONTAINERS_ENV_FILE);
    } catch {
      // File may already be removed.
    }
  };
}
