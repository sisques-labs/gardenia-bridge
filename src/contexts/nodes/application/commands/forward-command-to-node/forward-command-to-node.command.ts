import { buildCommandMessage } from '../../../domain/factories/command-message.factory';
import { ICommandMessage } from '../../../domain/interfaces/command-message.interface';
import { ICommandMessagePrimitives } from '../../../domain/primitives/command-message.primitives';
import { RawPayloadValueObject } from '../../../domain/value-objects/raw-payload/raw-payload.value-object';
import { TopicValueObject } from '../../../domain/value-objects/topic/topic.value-object';

export interface ForwardCommandToNodeCommandInput {
  sourceTopic: string;
  rawPayload: string;
  envelope: ICommandMessagePrimitives;
}

export class ForwardCommandToNodeCommand {
  public readonly sourceTopic: TopicValueObject;
  public readonly rawPayload: RawPayloadValueObject;
  public readonly envelope: ICommandMessage;

  constructor(input: ForwardCommandToNodeCommandInput) {
    this.sourceTopic = new TopicValueObject(input.sourceTopic);
    this.rawPayload = new RawPayloadValueObject(input.rawPayload);
    this.envelope = buildCommandMessage(input.envelope);
  }
}
