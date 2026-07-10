import { postgresConfig } from './postgres.config';

// TypeOrmModuleOptions is a broad union type. We cast to a typed record
// to access individual connection fields (host, port, username, etc.) in assertions.
type IndividualConnConfig = {
  type: string;
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  database?: string;
  synchronize?: boolean;
  migrationsRun?: boolean;
  autoLoadEntities?: boolean;
  url?: string;
};

const getConfig = () => postgresConfig() as unknown as IndividualConnConfig;

describe('postgresConfig', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('when all six env vars are present', () => {
    beforeEach(() => {
      process.env.DATABASE_DRIVER = 'postgres';
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_USERNAME = 'postgres';
      process.env.DATABASE_PASSWORD = 'secret';
      process.env.DATABASE_DATABASE = 'nestjs_template_db';
    });

    it('produces the correct host', () => {
      expect(getConfig().host).toBe('localhost');
    });

    it('produces port as a number parsed from DATABASE_PORT', () => {
      expect(getConfig().port).toBe(5432);
    });

    it('produces the correct username', () => {
      expect(getConfig().username).toBe('postgres');
    });

    it('produces the correct password', () => {
      expect(getConfig().password).toBe('secret');
    });

    it('produces the correct database name', () => {
      expect(getConfig().database).toBe('nestjs_template_db');
    });

    it('has synchronize set to false', () => {
      expect(getConfig().synchronize).toBe(false);
    });

    it('has migrationsRun set to true by default', () => {
      delete process.env.DATABASE_MIGRATIONS_RUN;
      expect(getConfig().migrationsRun).toBe(true);
    });

    it('has migrationsRun set to false when DATABASE_MIGRATIONS_RUN=false', () => {
      process.env.DATABASE_MIGRATIONS_RUN = 'false';
      expect(getConfig().migrationsRun).toBe(false);
    });
  });

  describe('when DATABASE_PORT is absent', () => {
    beforeEach(() => {
      process.env.DATABASE_DRIVER = 'postgres';
      process.env.DATABASE_HOST = 'localhost';
      delete process.env.DATABASE_PORT;
      process.env.DATABASE_USERNAME = 'postgres';
      process.env.DATABASE_PASSWORD = 'secret';
      process.env.DATABASE_DATABASE = 'nestjs_template_db';
    });

    it('defaults port to 5432', () => {
      expect(getConfig().port).toBe(5432);
    });
  });

  describe('when a required var is absent', () => {
    beforeEach(() => {
      process.env.DATABASE_HOST = 'localhost';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_USERNAME = 'postgres';
      process.env.DATABASE_PASSWORD = 'secret';
      process.env.DATABASE_DATABASE = 'nestjs_template_db';
    });

    it('produces undefined for DATABASE_HOST when not set', () => {
      delete process.env.DATABASE_HOST;
      // Validation is handled by NestJS ConfigModule validation schema at app boot.
      // At the factory level, the value is undefined — fail-loud is delegated upward.
      expect(getConfig().host).toBeUndefined();
    });

    it('produces undefined for DATABASE_USERNAME when not set', () => {
      delete process.env.DATABASE_USERNAME;
      expect(getConfig().username).toBeUndefined();
    });

    it('produces undefined for DATABASE_PASSWORD when not set', () => {
      delete process.env.DATABASE_PASSWORD;
      expect(getConfig().password).toBeUndefined();
    });

    it('produces undefined for DATABASE_DATABASE when not set', () => {
      delete process.env.DATABASE_DATABASE;
      expect(getConfig().database).toBeUndefined();
    });
  });

  describe('DATABASE_URL is not used', () => {
    it('does not read DATABASE_URL even when set', () => {
      process.env.DATABASE_URL = 'postgresql://should-not-be-used@localhost/db';
      process.env.DATABASE_HOST = 'correct-host';
      process.env.DATABASE_PORT = '5432';
      process.env.DATABASE_USERNAME = 'postgres';
      process.env.DATABASE_PASSWORD = 'secret';
      process.env.DATABASE_DATABASE = 'nestjs_template_db';
      const config = getConfig();
      expect(config.url).toBeUndefined();
      expect(config.host).toBe('correct-host');
    });
  });
});
