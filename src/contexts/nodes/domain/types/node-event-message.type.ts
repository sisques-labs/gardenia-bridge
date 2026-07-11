import { ICommandAckMessage } from '@contexts/nodes/domain/interfaces/command-ack-message.interface';
import { IHeartbeatMessage } from '@contexts/nodes/domain/interfaces/heartbeat-message.interface';
import { ITelemetryMessage } from '@contexts/nodes/domain/interfaces/telemetry-message.interface';

export type NodeEventMessage =
  ITelemetryMessage | IHeartbeatMessage | ICommandAckMessage;
