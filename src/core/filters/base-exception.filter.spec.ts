import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { BaseException } from '@sisques-labs/nestjs-kit';

import { BaseExceptionFilter } from '@core/filters/base-exception.filter';

class SampleDomainException extends BaseException {
  constructor() {
    super('Something went wrong');
  }
}

const buildHttpHost = (
  statusFn = jest.fn(),
  jsonFn = jest.fn(),
): ArgumentsHost => {
  const response = {
    status: jest.fn().mockReturnValue({ json: jsonFn }),
  };
  statusFn.mockReturnValue({ json: jsonFn });
  response.status = statusFn;

  return {
    getType: jest.fn().mockReturnValue('http'),
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue(response),
    }),
  } as unknown as ArgumentsHost;
};

describe('BaseExceptionFilter', () => {
  let filter: BaseExceptionFilter;

  beforeEach(() => {
    filter = new BaseExceptionFilter();
  });

  describe('catch() — HTTP host', () => {
    it('defaults to 400 for an unrecognized BaseException', () => {
      const statusFn = jest.fn().mockReturnValue({ json: jest.fn() });
      const host = buildHttpHost(statusFn);

      filter.catch(new SampleDomainException(), host);

      expect(statusFn).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    });

    it('writes the exception message in the JSON response body', () => {
      const jsonFn = jest.fn();
      const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
      const host = buildHttpHost(statusFn, jsonFn);
      const exception = new SampleDomainException();

      filter.catch(exception, host);

      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ message: exception.message }),
      );
    });
  });

  describe('catch() — GraphQL host', () => {
    it('throws a GraphQLError for GraphQL', () => {
      const host = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ArgumentsHost;

      expect(() => filter.catch(new SampleDomainException(), host)).toThrow();
    });

    it('sets extensions.code to the exception class name', () => {
      const host = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ArgumentsHost;

      const exception = new SampleDomainException();

      try {
        filter.catch(exception, host);
        fail('expected filter.catch to throw');
      } catch (e: any) {
        expect(e.extensions.code).toBe('SampleDomainException');
        expect(e.extensions.statusCode).toBe(HttpStatus.BAD_REQUEST);
      }
    });

    it('preserves the exception message', () => {
      const host = {
        getType: jest.fn().mockReturnValue('graphql'),
      } as unknown as ArgumentsHost;

      const exception = new SampleDomainException();

      try {
        filter.catch(exception, host);
        fail('expected filter.catch to throw');
      } catch (e: any) {
        expect(e.message).toBe(exception.message);
      }
    });
  });
});
