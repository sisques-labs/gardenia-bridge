import { z } from 'zod';

import { BridgeMessageTypeEnum } from '../../../domain/enums/bridge-message-type.enum';
import { bridgeMessageEnvelopeSchema } from './bridge-message-envelope.schema';

export const commandMessageSchema = bridgeMessageEnvelopeSchema.extend({
  type: z.literal(BridgeMessageTypeEnum.COMMAND),
  commandId: z.string().trim().min(1, 'commandId must not be empty'),
  action: z.string().trim().min(1, 'action must not be empty'),
  params: z.record(z.string(), z.unknown()).optional(),
});
