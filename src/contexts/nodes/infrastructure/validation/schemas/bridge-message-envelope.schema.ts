import { z } from 'zod';

import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';

export const bridgeMessageEnvelopeSchema = z.object({
  type: z.nativeEnum(BridgeMessageTypeEnum),
  nodeId: z.string().trim().min(1, 'nodeId must not be empty'),
  timestamp: z.iso.datetime({ offset: true }),
});
