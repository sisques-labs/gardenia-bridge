import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { BaseException } from '@sisques-labs/nestjs-kit';
import { Response } from 'express';
import { GraphQLError } from 'graphql';

/**
 * Per-context HTTP status resolvers, registered here as bounded contexts are
 * added. Each function returns a status for the exceptions it recognises, or
 * `undefined` to let the next resolver (or the default) decide.
 *
 * Example, once a `users` context exists:
 *   import { resolveUsersExceptionStatus } from '@contexts/users/transport/exceptions/users-exception.filter';
 *   const EXCEPTION_STATUS_RESOLVERS = [resolveUsersExceptionStatus];
 */
const EXCEPTION_STATUS_RESOLVERS: Array<
  (exception: BaseException) => number | undefined
> = [];

@Catch(BaseException)
export class BaseExceptionFilter
  implements ExceptionFilter, GqlExceptionFilter
{
  catch(exception: BaseException, host: ArgumentsHost): void {
    const status = this.resolveStatus(exception);

    const type = host.getType<'http' | 'graphql'>();

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      response.status(status).json({
        statusCode: status,
        message: exception.message,
        error: exception.name,
      });
    } else {
      throw new GraphQLError(exception.message, {
        extensions: { code: exception.name, statusCode: status },
      });
    }
  }

  private resolveStatus(exception: BaseException): number {
    for (const resolve of EXCEPTION_STATUS_RESOLVERS) {
      const status = resolve(exception);
      if (status !== undefined) {
        return status;
      }
    }
    return HttpStatus.BAD_REQUEST;
  }
}
