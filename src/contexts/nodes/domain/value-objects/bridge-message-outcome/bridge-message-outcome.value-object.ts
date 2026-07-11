import { EnumValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageOutcomeEnum } from '../../enums/bridge-message-outcome.enum';

export class BridgeMessageOutcomeValueObject extends EnumValueObject<
  typeof BridgeMessageOutcomeEnum
> {
  protected get enumObject(): typeof BridgeMessageOutcomeEnum {
    return BridgeMessageOutcomeEnum;
  }
}
