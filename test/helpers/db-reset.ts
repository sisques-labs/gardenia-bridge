import { DataSource } from 'typeorm';

/**
 * Application tables truncated between DB-backed test cases. Empty until the
 * first bounded context adds entities — update this list when a new @Entity
 * is added so integration/E2E specs stay isolated between tests.
 */
export const TRUNCATE_TABLES: readonly string[] = [];

/**
 * Truncates all application tables and restarts identity sequences.
 * Call in `beforeEach` in integration and E2E specs to guarantee isolation between tests.
 */
export async function truncateAll(dataSource: DataSource): Promise<void> {
  if (TRUNCATE_TABLES.length === 0) {
    return;
  }

  const tableList = TRUNCATE_TABLES.map((table) => `"${table}"`).join(', ');

  await dataSource.query(`TRUNCATE ${tableList} RESTART IDENTITY CASCADE`);
}
