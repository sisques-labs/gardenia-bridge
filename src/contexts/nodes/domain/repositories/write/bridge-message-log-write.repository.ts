import { IBridgeMessageLogEntry } from '../../interfaces/bridge-message-log-entry.interface';

export const BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY = Symbol(
  'BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY',
);

export interface IBridgeMessageLogWriteRepository {
  record(entry: IBridgeMessageLogEntry): Promise<void>;
}
