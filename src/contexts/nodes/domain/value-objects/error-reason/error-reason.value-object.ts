import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class ErrorReasonValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 2048, trim: true });
  }
}
