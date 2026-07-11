import { BaseException } from '@sisques-labs/nestjs-kit';

export class InvalidMessagePayloadException extends BaseException {
  constructor(reason: string) {
    super(`Invalid bridge message payload: ${reason}`);
  }
}
