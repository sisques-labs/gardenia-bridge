import { EnumValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageTypeEnum } from '../../enums/bridge-message-type.enum';

export class BridgeMessageTypeValueObject extends EnumValueObject<
  typeof BridgeMessageTypeEnum
> {
  protected get enumObject(): typeof BridgeMessageTypeEnum {
    return BridgeMessageTypeEnum;
  }
}
