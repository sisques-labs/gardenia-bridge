import { SensorTypeValueObject } from '../value-objects/sensor-type/sensor-type.value-object';
import { SensorUnitValueObject } from '../value-objects/sensor-unit/sensor-unit.value-object';
import { SensorValueValueObject } from '../value-objects/sensor-value/sensor-value.value-object';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ITelemetryMessage extends IBridgeMessageEnvelope {
  sensorType: SensorTypeValueObject;
  value: SensorValueValueObject;
  unit?: SensorUnitValueObject;
}
