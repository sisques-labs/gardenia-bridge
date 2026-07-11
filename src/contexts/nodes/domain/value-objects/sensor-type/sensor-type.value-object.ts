import { StringValueObject } from '@sisques-labs/nestjs-kit';

// Deliberately free-text, not enum-backed: the bridge relays telemetry
// without knowing the catalog of sensor types — that catalog belongs to
// gardenia-api, which owns the domain concept of what a sensor reading means.
export class SensorTypeValueObject extends StringValueObject {
  constructor(value: string) {
    super(value, { allowEmpty: false, maxLength: 100, trim: true });
  }
}
