import { StringValueObject } from '@sisques-labs/nestjs-kit';

export class RawPayloadValueObject extends StringValueObject {
  constructor(value: string) {
    // Allows empty: an unparseable payload (e.g. non-JSON) is still a valid
    // raw payload to audit-log, even if it's a blank string.
    super(value, { allowEmpty: true, maxLength: 65536 });
  }
}
