import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class TopicValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 512, trim: true });
  }
}
