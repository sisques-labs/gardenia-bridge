import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config({ quiet: true });

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable "${name}"`);
  return value;
}

export default new DataSource({
  type: requiredEnv('DATABASE_DRIVER') as 'postgres',
  host: requiredEnv('DATABASE_HOST'),
  port: Number(requiredEnv('DATABASE_PORT')),
  username: requiredEnv('DATABASE_USERNAME'),
  password: requiredEnv('DATABASE_PASSWORD'),
  database: requiredEnv('DATABASE_DATABASE'),
  migrationsTableName:
    process.env.DATABASE_MIGRATIONS_TABLE_NAME ?? 'migrations',
  migrationsRun: false,
  synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
  logging: process.env.NODE_ENV !== 'production',
  extra: { connectionLimit: 10 },
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/database/migrations/*{.ts,.js}'],
});
