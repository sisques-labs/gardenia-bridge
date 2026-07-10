import { z } from 'zod';

import { BridgeMessageTypeEnum } from '../../../domain/enums/bridge-message-type.enum';
import { bridgeMessageEnvelopeSchema } from './bridge-message-envelope.schema';

export const commandAckMessageSchema = bridgeMessageEnvelopeSchema.extend({
  type: z.literal(BridgeMessageTypeEnum.COMMAND_ACK),
  commandId: z.string().trim().min(1, 'commandId must not be empty'),
  success: z.boolean(),
  message: z.string().trim().min(1).optional(),
});
