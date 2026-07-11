import { DateValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageTypeEnum } from '../enums/bridge-message-type.enum';
import { InvalidMessagePayloadException } from '../exceptions/invalid-message-payload.exception';
import { ICommandAckMessagePrimitives } from '../primitives/command-ack-message.primitives';
import { IHeartbeatMessagePrimitives } from '../primitives/heartbeat-message.primitives';
import { NodeEventMessagePrimitives } from '../primitives/node-event-message.primitives.type';
import { ITelemetryMessagePrimitives } from '../primitives/telemetry-message.primitives';
import { AckMessageValueObject } from '../value-objects/ack-message/ack-message.value-object';
import { BridgeMessageTypeValueObject } from '../value-objects/bridge-message-type/bridge-message-type.value-object';
import { CommandIdValueObject } from '../value-objects/command-id/command-id.value-object';
import { CommandSuccessValueObject } from '../value-objects/command-success/command-success.value-object';
import { NodeIdValueObject } from '../value-objects/node-id/node-id.value-object';
import { NodeStatusValueObject } from '../value-objects/node-status/node-status.value-object';
import { SensorTypeValueObject } from '../value-objects/sensor-type/sensor-type.value-object';
import { SensorUnitValueObject } from '../value-objects/sensor-unit/sensor-unit.value-object';
import { SensorValueValueObject } from '../value-objects/sensor-value/sensor-value.value-object';
import { UptimeSecondsValueObject } from '../value-objects/uptime-seconds/uptime-seconds.value-object';
import { ICommandAckMessage } from '../interfaces/command-ack-message.interface';
import { IHeartbeatMessage } from '../interfaces/heartbeat-message.interface';
import { ITelemetryMessage } from '../interfaces/telemetry-message.interface';
import { NodeEventMessage } from '../interfaces/node-event-message.type';

export function buildTelemetryMessage(
  primitives: ITelemetryMessagePrimitives,
): ITelemetryMessage {
  return {
    type: new BridgeMessageTypeValueObject(primitives.type),
    nodeId: new NodeIdValueObject(primitives.nodeId),
    timestamp: new DateValueObject(new Date(primitives.timestamp)),
    sensorType: new SensorTypeValueObject(primitives.sensorType),
    value: new SensorValueValueObject(primitives.value),
    unit: primitives.unit
      ? new SensorUnitValueObject(primitives.unit)
      : undefined,
  };
}

export function buildHeartbeatMessage(
  primitives: IHeartbeatMessagePrimitives,
): IHeartbeatMessage {
  return {
    type: new BridgeMessageTypeValueObject(primitives.type),
    nodeId: new NodeIdValueObject(primitives.nodeId),
    timestamp: new DateValueObject(new Date(primitives.timestamp)),
    status: primitives.status
      ? new NodeStatusValueObject(primitives.status)
      : undefined,
    uptimeSeconds:
      primitives.uptimeSeconds !== undefined
        ? new UptimeSecondsValueObject(primitives.uptimeSeconds)
        : undefined,
  };
}

export function buildCommandAckMessage(
  primitives: ICommandAckMessagePrimitives,
): ICommandAckMessage {
  return {
    type: new BridgeMessageTypeValueObject(primitives.type),
    nodeId: new NodeIdValueObject(primitives.nodeId),
    timestamp: new DateValueObject(new Date(primitives.timestamp)),
    commandId: new CommandIdValueObject(primitives.commandId),
    success: new CommandSuccessValueObject(primitives.success),
    message: primitives.message
      ? new AckMessageValueObject(primitives.message)
      : undefined,
  };
}

export function buildNodeEventMessage(
  primitives: NodeEventMessagePrimitives,
): NodeEventMessage {
  switch (primitives.type) {
    case BridgeMessageTypeEnum.TELEMETRY:
      return buildTelemetryMessage(primitives as ITelemetryMessagePrimitives);
    case BridgeMessageTypeEnum.HEARTBEAT:
      return buildHeartbeatMessage(primitives as IHeartbeatMessagePrimitives);
    case BridgeMessageTypeEnum.COMMAND_ACK:
      return buildCommandAckMessage(primitives as ICommandAckMessagePrimitives);
    default:
      throw new InvalidMessagePayloadException(
        `Unsupported node event message type "${primitives.type}"`,
      );
  }
}

export function nodeEventMessageToPrimitives(
  message: NodeEventMessage,
): NodeEventMessagePrimitives {
  const base = {
    type: message.type.value as BridgeMessageTypeEnum,
    nodeId: message.nodeId.value,
    timestamp: message.timestamp.toISOString(),
  };

  if (message.type.is(BridgeMessageTypeEnum.TELEMETRY)) {
    const telemetry = message as ITelemetryMessage;
    return {
      ...base,
      sensorType: telemetry.sensorType.value,
      value: telemetry.value.value,
      unit: telemetry.unit?.value,
    };
  }

  if (message.type.is(BridgeMessageTypeEnum.HEARTBEAT)) {
    const heartbeat = message as IHeartbeatMessage;
    return {
      ...base,
      status: heartbeat.status?.value,
      uptimeSeconds: heartbeat.uptimeSeconds?.value,
    };
  }

  const commandAck = message as ICommandAckMessage;
  return {
    ...base,
    commandId: commandAck.commandId.value,
    success: commandAck.success.value,
    message: commandAck.message?.value,
  };
}
