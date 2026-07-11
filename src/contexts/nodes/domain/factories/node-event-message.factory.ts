import { DateValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { InvalidMessagePayloadException } from '@contexts/nodes/domain/exceptions/invalid-message-payload.exception';
import { ICommandAckMessagePrimitives } from '@contexts/nodes/domain/primitives/command-ack-message.primitives';
import { IHeartbeatMessagePrimitives } from '@contexts/nodes/domain/primitives/heartbeat-message.primitives';
import { NodeEventMessagePrimitives } from '@contexts/nodes/domain/types/node-event-message-primitives.type';
import { ITelemetryMessagePrimitives } from '@contexts/nodes/domain/primitives/telemetry-message.primitives';
import { AckMessageValueObject } from '@contexts/nodes/domain/value-objects/ack-message/ack-message.value-object';
import { BridgeMessageTypeValueObject } from '@contexts/nodes/domain/value-objects/bridge-message-type/bridge-message-type.value-object';
import { CommandIdValueObject } from '@contexts/nodes/domain/value-objects/command-id/command-id.value-object';
import { CommandSuccessValueObject } from '@contexts/nodes/domain/value-objects/command-success/command-success.value-object';
import { NodeIdValueObject } from '@contexts/nodes/domain/value-objects/node-id/node-id.value-object';
import { NodeStatusValueObject } from '@contexts/nodes/domain/value-objects/node-status/node-status.value-object';
import { SensorTypeValueObject } from '@contexts/nodes/domain/value-objects/sensor-type/sensor-type.value-object';
import { SensorUnitValueObject } from '@contexts/nodes/domain/value-objects/sensor-unit/sensor-unit.value-object';
import { SensorValueValueObject } from '@contexts/nodes/domain/value-objects/sensor-value/sensor-value.value-object';
import { UptimeSecondsValueObject } from '@contexts/nodes/domain/value-objects/uptime-seconds/uptime-seconds.value-object';
import { ICommandAckMessage } from '@contexts/nodes/domain/interfaces/command-ack-message.interface';
import { IHeartbeatMessage } from '@contexts/nodes/domain/interfaces/heartbeat-message.interface';
import { ITelemetryMessage } from '@contexts/nodes/domain/interfaces/telemetry-message.interface';
import { NodeEventMessage } from '@contexts/nodes/domain/types/node-event-message.type';

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
