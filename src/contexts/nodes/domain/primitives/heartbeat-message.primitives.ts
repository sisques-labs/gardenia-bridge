import { IBridgeMessageEnvelopePrimitives } from './bridge-message-envelope.primitives';

export interface IHeartbeatMessagePrimitives extends IBridgeMessageEnvelopePrimitives {
  status?: string;
  uptimeSeconds?: number;
}
