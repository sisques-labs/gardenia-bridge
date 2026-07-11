import { IBridgeMessageEnvelopePrimitives } from './bridge-message-envelope.primitives';

export interface ICommandAckMessagePrimitives extends IBridgeMessageEnvelopePrimitives {
  commandId: string;
  success: boolean;
  message?: string;
}
