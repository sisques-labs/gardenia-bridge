import { BaseEvent } from '@sisques-labs/nestjs-kit';

import { IBridgeMessageLogEventData } from '../interfaces/bridge-message-log-event-data.interface';

export class BridgeMessageRecordedEvent extends BaseEvent<IBridgeMessageLogEventData> {
  constructor(aggregateId: string, data: IBridgeMessageLogEventData) {
    super(
      {
        aggregateRootId: aggregateId,
        aggregateRootType: 'BridgeMessageLogAggregate',
        entityId: aggregateId,
        entityType: 'BridgeMessageLogAggregate',
        eventType: 'BridgeMessageRecorded',
      },
      data,
    );
  }
}
