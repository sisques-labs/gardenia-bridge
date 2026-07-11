import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class NodeStatusValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 100, trim: true });
  }
}
