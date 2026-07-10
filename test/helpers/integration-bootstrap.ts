import { DynamicModule, Provider, Type } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken, TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { DataSource } from 'typeorm';
import { SharedGraphQLModule } from '@sisques-labs/nestjs-kit/graphql';

import { appConfig } from '../../src/core/config/app.config';
import { bootstrapTestDataSource } from './test-data-source';

const DB_HOST = process.env.DATABASE_HOST ?? 'localhost';
const DB_PORT = parseInt(process.env.DATABASE_PORT ?? '5433', 10);
const DB_DATABASE = process.env.DATABASE_DATABASE ?? 'nestjs_template_test';
const DB_USERNAME = process.env.DATABASE_USERNAME ?? 'postgres';
const DB_PASSWORD = process.env.DATABASE_PASSWORD ?? 'postgres';

export interface IntegrationModuleOptions {
  imports: Array<Type<unknown> | DynamicModule>;
  providers?: Provider[];
}

export interface IntegrationContext {
  module: TestingModule;
  dataSource: DataSource;
  close: () => Promise<void>;
}

/**
 * Bootstraps a slim TestingModule for integration specs — real Postgres, no
 * HTTP layer. Pass the bounded-context module(s) under test via `imports`.
 */
export async function createIntegrationModule(
  options: IntegrationModuleOptions,
): Promise<IntegrationContext> {
  await bootstrapTestDataSource();

  const moduleFixture = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        load: [appConfig],
      }),
      TypeOrmModule.forRoot({
        type: 'postgres',
        host: DB_HOST,
        port: DB_PORT,
        database: DB_DATABASE,
        username: DB_USERNAME,
        password: DB_PASSWORD,
        // Entities are auto-loaded from whatever bounded-context module the test
        // imports (each registers its entity via TypeOrmModule.forFeature), so
        // adding a new context never requires editing this list. Mirrors the
        // production AppModule (autoLoadEntities: true).
        autoLoadEntities: true,
        synchronize: false,
        logging: false,
      }),
      CqrsModule,
      SharedGraphQLModule,
      ...options.imports,
    ],
    providers: options.providers ?? [],
  }).compile();

  const dataSource = moduleFixture.get<DataSource>(getDataSourceToken());

  return {
    module: moduleFixture,
    dataSource,
    close: async () => {
      await moduleFixture.close();
    },
  };
}
