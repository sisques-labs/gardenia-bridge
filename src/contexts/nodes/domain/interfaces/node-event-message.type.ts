import { ICommandAckMessage } from './command-ack-message.interface';
import { IHeartbeatMessage } from './heartbeat-message.interface';
import { ITelemetryMessage } from './telemetry-message.interface';

export type NodeEventMessage =
  ITelemetryMessage | IHeartbeatMessage | ICommandAckMessage;
