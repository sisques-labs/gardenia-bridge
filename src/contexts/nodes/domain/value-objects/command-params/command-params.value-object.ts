import { JsonValueObject } from '@sisques-labs/nestjs-kit';

export class CommandParamsValueObject extends JsonValueObject {
  constructor(value: Record<string, unknown>) {
    super(value, { allowEmpty: true });
  }
}
