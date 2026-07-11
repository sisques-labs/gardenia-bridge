import { IBaseWriteRepository } from '@sisques-labs/nestjs-kit';

import { BridgeMessageLogAggregate } from '@contexts/nodes/domain/aggregates/bridge-message-log.aggregate';

export const BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY = Symbol(
  'BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY',
);

export type IBridgeMessageLogWriteRepository =
  IBaseWriteRepository<BridgeMessageLogAggregate>;
