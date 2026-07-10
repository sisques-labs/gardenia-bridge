import { ICommandMessage } from '../../../domain/interfaces/command-message.interface';

export interface ForwardCommandToNodeCommandInput {
  sourceTopic: string;
  rawPayload: string;
  envelope: ICommandMessage;
}

export class ForwardCommandToNodeCommand {
  public readonly sourceTopic: string;
  public readonly rawPayload: string;
  public readonly envelope: ICommandMessage;

  constructor(input: ForwardCommandToNodeCommandInput) {
    this.sourceTopic = input.sourceTopic;
    this.rawPayload = input.rawPayload;
    this.envelope = input.envelope;
  }
}
