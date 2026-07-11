import { buildNodeEventMessage } from '@contexts/nodes/domain/factories/node-event-message.factory';
import { NodeEventMessage } from '@contexts/nodes/domain/types/node-event-message.type';
import { NodeEventMessagePrimitives } from '@contexts/nodes/domain/types/node-event-message-primitives.type';
import { RawPayloadValueObject } from '@contexts/nodes/domain/value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '@contexts/nodes/domain/value-objects/topic/topic.value-object';

export interface ForwardNodeEventToKafkaCommandInput {
  sourceTopic: string;
  rawPayload: string;
  envelope: NodeEventMessagePrimitives;
}

export class ForwardNodeEventToKafkaCommand {
  public readonly sourceTopic: TopicValueObject;
  public readonly rawPayload: RawPayloadValueObject;
  public readonly envelope: NodeEventMessage;

  constructor(input: ForwardNodeEventToKafkaCommandInput) {
    this.sourceTopic = new TopicValueObject(input.sourceTopic);
    this.rawPayload = new RawPayloadValueObject(input.rawPayload);
    this.envelope = buildNodeEventMessage(input.envelope);
  }
}
