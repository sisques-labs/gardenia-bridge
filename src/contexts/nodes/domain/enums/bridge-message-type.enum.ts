export enum BridgeMessageTypeEnum {
  TELEMETRY = 'telemetry',
  HEARTBEAT = 'heartbeat',
  COMMAND = 'command',
  COMMAND_ACK = 'command-ack',
  // Only used by BridgeMessageLog entries where the payload failed
  // validation before a type could even be resolved.
  UNKNOWN = 'unknown',
}
