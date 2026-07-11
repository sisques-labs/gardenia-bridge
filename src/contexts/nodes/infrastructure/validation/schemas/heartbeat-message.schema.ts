import { z } from 'zod';

import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { bridgeMessageEnvelopeSchema } from './bridge-message-envelope.schema';

export const heartbeatMessageSchema = bridgeMessageEnvelopeSchema.extend({
  type: z.literal(BridgeMessageTypeEnum.HEARTBEAT),
  status: z.string().trim().min(1).optional(),
  uptimeSeconds: z.number().nonnegative().optional(),
});
