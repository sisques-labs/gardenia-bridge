import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class CommandActionValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 100, trim: true });
  }
}
