import { IBridgeMessageEnvelopePrimitives } from './bridge-message-envelope.primitives';

export interface ITelemetryMessagePrimitives extends IBridgeMessageEnvelopePrimitives {
  sensorType: string;
  value: number;
  unit?: string;
}
