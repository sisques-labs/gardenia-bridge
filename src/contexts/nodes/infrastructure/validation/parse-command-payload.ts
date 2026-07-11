import { InvalidMessagePayloadException } from '@contexts/nodes/domain/exceptions/invalid-message-payload.exception';
import { ICommandMessagePrimitives } from '@contexts/nodes/domain/primitives/command-message.primitives';
import { commandMessageSchema } from './schemas/command-message.schema';

/**
 * Validates the raw Kafka payload against its Zod schema and returns
 * PRIMITIVES — wrapping into value objects happens at the command boundary
 * (ForwardCommandToNodeCommand's constructor).
 */
export function parseCommandPayload(
  sourceTopic: string,
  rawPayload: string,
): ICommandMessagePrimitives {
  let json: unknown;
  try {
    json = JSON.parse(rawPayload);
  } catch {
    throw new InvalidMessagePayloadException(
      `Payload on topic "${sourceTopic}" is not valid JSON`,
    );
  }

  const result = commandMessageSchema.safeParse(json);
  if (!result.success) {
    throw new InvalidMessagePayloadException(
      `Payload on topic "${sourceTopic}" failed command schema validation: ${result.error.message}`,
    );
  }

  return result.data;
}
