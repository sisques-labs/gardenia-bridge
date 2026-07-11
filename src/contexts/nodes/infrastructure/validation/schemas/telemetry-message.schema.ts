import { z } from 'zod';

import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { bridgeMessageEnvelopeSchema } from './bridge-message-envelope.schema';

export const telemetryMessageSchema = bridgeMessageEnvelopeSchema.extend({
  type: z.literal(BridgeMessageTypeEnum.TELEMETRY),
  sensorType: z.string().trim().min(1, 'sensorType must not be empty'),
  value: z.number(),
  unit: z.string().trim().min(1).optional(),
});
