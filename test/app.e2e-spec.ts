import { createE2EApp, E2EContext } from './helpers/app-bootstrap';
import { truncateAll } from './helpers/db-reset';
import { gql } from './helpers/graphql-client';

describe('App bootstrap (e2e)', () => {
  let ctx: E2EContext;

  beforeAll(async () => {
    ctx = await createE2EApp();
  });

  afterAll(async () => {
    await ctx.close();
  });

  beforeEach(async () => {
    await truncateAll(ctx.dataSource);
  });

  it('app initializes and DataSource is connected', () => {
    expect(ctx.app).toBeDefined();
    expect(ctx.dataSource.isInitialized).toBe(true);
  });

  it('REST health check responds', async () => {
    const res = await ctx.http().get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GraphQL endpoint resolves the placeholder ping query', async () => {
    const res = await gql(ctx.app, '{ ping }');

    expect(res.status).toBe(200);
    expect(res.body.data.ping).toBe('pong');
  });
});
