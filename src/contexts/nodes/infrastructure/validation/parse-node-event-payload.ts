import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { InvalidMessagePayloadException } from '@contexts/nodes/domain/exceptions/invalid-message-payload.exception';
import { NodeEventMessagePrimitives } from '@contexts/nodes/domain/types/node-event-message-primitives.type';
import { commandAckMessageSchema } from './schemas/command-ack-message.schema';
import { heartbeatMessageSchema } from './schemas/heartbeat-message.schema';
import { telemetryMessageSchema } from './schemas/telemetry-message.schema';

const TELEMETRY_TOPIC_PATTERN = /^sensors\/([^/]+)\/[^/]+\/telemetry$/;
const HEARTBEAT_TOPIC_PATTERN = /^nodes\/([^/]+)\/heartbeat$/;
const COMMAND_ACK_TOPIC_PATTERN = /^nodes\/([^/]+)\/commands\/ack$/;

export function resolveNodeEventType(
  topic: string,
): BridgeMessageTypeEnum | null {
  if (TELEMETRY_TOPIC_PATTERN.test(topic)) {
    return BridgeMessageTypeEnum.TELEMETRY;
  }
  if (HEARTBEAT_TOPIC_PATTERN.test(topic)) {
    return BridgeMessageTypeEnum.HEARTBEAT;
  }
  if (COMMAND_ACK_TOPIC_PATTERN.test(topic)) {
    return BridgeMessageTypeEnum.COMMAND_ACK;
  }
  return null;
}

export function extractNodeIdFromTopic(topic: string): string | null {
  const match =
    TELEMETRY_TOPIC_PATTERN.exec(topic) ??
    HEARTBEAT_TOPIC_PATTERN.exec(topic) ??
    COMMAND_ACK_TOPIC_PATTERN.exec(topic);
  return match ? match[1] : null;
}

/**
 * Validates the raw MQTT payload against its Zod schema and returns
 * PRIMITIVES — not the VO-typed domain object. Wrapping primitives into
 * value objects happens at the command boundary
 * (ForwardNodeEventToKafkaCommand's constructor), matching this org's
 * convention of primitives-in, VO-typed-fields-out for CQRS commands.
 */
export function parseNodeEventPayload(
  topic: string,
  rawPayload: string,
): NodeEventMessagePrimitives {
  const type = resolveNodeEventType(topic);
  if (!type) {
    throw new InvalidMessagePayloadException(
      `Unrecognized MQTT topic pattern: "${topic}"`,
    );
  }

  let json: unknown;
  try {
    json = JSON.parse(rawPayload);
  } catch {
    throw new InvalidMessagePayloadException(
      `Payload on topic "${topic}" is not valid JSON`,
    );
  }

  const schema =
    type === BridgeMessageTypeEnum.TELEMETRY
      ? telemetryMessageSchema
      : type === BridgeMessageTypeEnum.HEARTBEAT
        ? heartbeatMessageSchema
        : commandAckMessageSchema;

  const result = schema.safeParse(json);
  if (!result.success) {
    throw new InvalidMessagePayloadException(
      `Payload on topic "${topic}" failed ${type} schema validation: ${result.error.message}`,
    );
  }

  return result.data;
}
