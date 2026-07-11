import { ICommandAckMessagePrimitives } from '@contexts/nodes/domain/primitives/command-ack-message.primitives';
import { IHeartbeatMessagePrimitives } from '@contexts/nodes/domain/primitives/heartbeat-message.primitives';
import { ITelemetryMessagePrimitives } from '@contexts/nodes/domain/primitives/telemetry-message.primitives';

export type NodeEventMessagePrimitives =
  | ITelemetryMessagePrimitives
  | IHeartbeatMessagePrimitives
  | ICommandAckMessagePrimitives;
