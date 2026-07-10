import { NodeEventMessage } from '../../../domain/interfaces/node-event-message.type';

export interface ForwardNodeEventToKafkaCommandInput {
  sourceTopic: string;
  rawPayload: string;
  envelope: NodeEventMessage;
}

export class ForwardNodeEventToKafkaCommand {
  public readonly sourceTopic: string;
  public readonly rawPayload: string;
  public readonly envelope: NodeEventMessage;

  constructor(input: ForwardNodeEventToKafkaCommandInput) {
    this.sourceTopic = input.sourceTopic;
    this.rawPayload = input.rawPayload;
    this.envelope = input.envelope;
  }
}
