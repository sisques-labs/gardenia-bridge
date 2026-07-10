import { DataSource, DataSourceOptions } from 'typeorm';

// Add migration imports here as the first bounded context introduces them,
// e.g. `import { CreateOrders1780000000000 } from '../../src/database/migrations/1780000000000-CreateOrders';`
const TEST_MIGRATIONS: DataSourceOptions['migrations'] = [];

export function getTestDataSourceOptions(): DataSourceOptions {
  return {
    type: 'postgres',
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: parseInt(process.env.DATABASE_PORT ?? '5433', 10),
    database: process.env.DATABASE_DATABASE ?? 'nestjs_template_test',
    username: process.env.DATABASE_USERNAME ?? 'postgres',
    password: process.env.DATABASE_PASSWORD ?? 'postgres',
    entities: [],
    migrations: TEST_MIGRATIONS,
    migrationsTableName:
      process.env.DATABASE_MIGRATIONS_TABLE_NAME ?? 'migrations',
    synchronize: false,
    logging: false,
  };
}

let migrationsApplied = false;

/**
 * Applies pending TypeORM migrations against the test database.
 * Safe to call multiple times — runs once per Jest process.
 */
export async function bootstrapTestDataSource(): Promise<void> {
  if (migrationsApplied) {
    return;
  }

  const dataSource = new DataSource(getTestDataSourceOptions());

  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    migrationsApplied = true;
  } catch (error) {
    const hint =
      'If the test DB was previously created with synchronize:true, reset it with: pnpm test:db:down && docker volume rm nestjs-template_postgres_data 2>/dev/null; pnpm test:db:up';

    throw new Error(
      `Failed to apply test database migrations. ${hint}\n\nOriginal error: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

/** Reset migration guard — for test suites that need a fresh bootstrap. */
export function resetTestMigrationState(): void {
  migrationsApplied = false;
}
