import { Query, Resolver } from '@nestjs/graphql';

/**
 * Placeholder root Query. Apollo requires at least one Query field to build a
 * schema, and this template ships with zero bounded contexts — delete this
 * resolver once the first context registers its own Query.
 */
@Resolver()
export class PingResolver {
  @Query(() => String, {
    description: 'Liveness check for the GraphQL schema.',
  })
  ping(): string {
    return 'pong';
  }
}
