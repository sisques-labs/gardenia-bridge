import { EnumValueObject } from '@sisques-labs/nestjs-kit';

import { BridgeMessageDirectionEnum } from '../../enums/bridge-message-direction.enum';

export class BridgeMessageDirectionValueObject extends EnumValueObject<
  typeof BridgeMessageDirectionEnum
> {
  protected get enumObject(): typeof BridgeMessageDirectionEnum {
    return BridgeMessageDirectionEnum;
  }
}
