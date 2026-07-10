import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface ITelemetryMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.TELEMETRY;
  sensorType: string;
  value: number;
  unit?: string;
}
