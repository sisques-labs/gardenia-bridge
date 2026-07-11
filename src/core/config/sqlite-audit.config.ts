import { join } from 'path';
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

// Second, independent TypeORM connection (name: 'sqlite-audit') for the
// `nodes` context's local audit log — see
// openspec/changes/kafka-mqtt-bridge/design.md for why this runs alongside,
// not instead of, the main Postgres connection.
export const sqliteAuditConfig = registerAs(
  'sqliteAudit',
  (): TypeOrmModuleOptions => ({
    type: 'better-sqlite3',
    database:
      process.env.BRIDGE_AUDIT_DB_PATH?.trim() || './data/bridge-audit.sqlite',
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: process.env.DATABASE_MIGRATIONS_RUN !== 'false',
    migrations: [
      join(__dirname, '../../database/migrations-sqlite/*{.ts,.js}'),
    ],
  }),
);
