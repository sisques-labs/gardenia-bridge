import { NodeStatusValueObject } from '@contexts/nodes/domain/value-objects/node-status/node-status.value-object';
import { UptimeSecondsValueObject } from '@contexts/nodes/domain/value-objects/uptime-seconds/uptime-seconds.value-object';
import { IBridgeMessageEnvelope } from './bridge-message-envelope.interface';

export interface IHeartbeatMessage extends IBridgeMessageEnvelope {
  status?: NodeStatusValueObject;
  uptimeSeconds?: UptimeSecondsValueObject;
}
