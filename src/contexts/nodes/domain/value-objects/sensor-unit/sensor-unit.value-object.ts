import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class SensorUnitValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 20, trim: true });
  }
}
