import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ quiet: true });

export default new DataSource({
  type: 'better-sqlite3',
  database:
    process.env.BRIDGE_AUDIT_DB_PATH?.trim() || './data/bridge-audit.sqlite',
  migrationsTableName: 'migrations_sqlite',
  migrationsRun: false,
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  entities: [
    'src/contexts/nodes/infrastructure/persistence/sqlite/entities/*.entity{.ts,.js}',
  ],
  migrations: ['src/database/migrations-sqlite/*{.ts,.js}'],
});
