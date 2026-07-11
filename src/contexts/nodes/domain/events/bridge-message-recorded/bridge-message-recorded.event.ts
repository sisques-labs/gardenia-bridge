import { BaseEvent, IEventMetadata } from '@sisques-labs/nestjs-kit';

import { IBridgeMessageLogEventData } from '@contexts/nodes/domain/events/interfaces/bridge-message-log-event-data.interface';

export class BridgeMessageRecordedEvent extends BaseEvent<IBridgeMessageLogEventData> {
  constructor(metadata: IEventMetadata, data: IBridgeMessageLogEventData) {
    super(metadata, data);
  }
}
