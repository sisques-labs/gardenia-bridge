import { NumberValueObject } from '@sisques-labs/nestjs-kit';

export class SensorValueValueObject extends NumberValueObject {
  constructor(value: number) {
    super(value, { allowDecimals: true });
  }
}
