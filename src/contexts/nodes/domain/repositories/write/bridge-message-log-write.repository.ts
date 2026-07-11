import { BridgeMessageLogAggregate } from '../../aggregates/bridge-message-log.aggregate';

export const BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY = Symbol(
  'BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY',
);

export interface IBridgeMessageLogWriteRepository {
  save(aggregate: BridgeMessageLogAggregate): Promise<void>;
}
