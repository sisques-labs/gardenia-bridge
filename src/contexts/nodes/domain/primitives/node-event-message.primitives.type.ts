import { ICommandAckMessagePrimitives } from './command-ack-message.primitives';
import { IHeartbeatMessagePrimitives } from './heartbeat-message.primitives';
import { ITelemetryMessagePrimitives } from './telemetry-message.primitives';

export type NodeEventMessagePrimitives =
  | ITelemetryMessagePrimitives
  | IHeartbeatMessagePrimitives
  | ICommandAckMessagePrimitives;
