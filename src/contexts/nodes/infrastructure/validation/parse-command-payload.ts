import { InvalidMessagePayloadException } from '../../domain/exceptions/invalid-message-payload.exception';
import { ICommandMessage } from '../../domain/interfaces/command-message.interface';
import { commandMessageSchema } from './schemas/command-message.schema';

export function parseCommandPayload(
  sourceTopic: string,
  rawPayload: string,
): ICommandMessage {
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
