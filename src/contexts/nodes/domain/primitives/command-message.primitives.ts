import { IBridgeMessageEnvelopePrimitives } from './bridge-message-envelope.primitives';

export interface ICommandMessagePrimitives extends IBridgeMessageEnvelopePrimitives {
  commandId: string;
  action: string;
  params?: Record<string, unknown>;
}
