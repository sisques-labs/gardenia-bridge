import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';

/**
 * Sends a GraphQL request to the running app.
 *
 * @param app    - The bootstrapped NestJS application
 * @param query  - GraphQL operation string (query or mutation)
 * @param variables - Optional variables map
 */
export function gql(
  app: INestApplication,
  query: string,
  variables?: Record<string, unknown>,
): request.Test {
  return request(app.getHttpServer())
    .post('/graphql')
    .send({ query, variables: variables ?? {} });
}
