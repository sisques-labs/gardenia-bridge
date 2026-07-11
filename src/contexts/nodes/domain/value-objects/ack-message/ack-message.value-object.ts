import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class AckMessageValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 1024, trim: true });
  }
}
