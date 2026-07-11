import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageDirectionValueObject } from './bridge-message-direction.value-object';

describe('BridgeMessageDirectionValueObject', () => {
  it.each(Object.values(BridgeMessageDirectionEnum))(
    'accepts valid direction: %s',
    (direction) => {
      expect(
        () => new BridgeMessageDirectionValueObject(direction),
      ).not.toThrow();
    },
  );

  it('throws for an invalid direction value', () => {
    expect(
      () =>
        new BridgeMessageDirectionValueObject(
          'sideways' as BridgeMessageDirectionEnum,
        ),
    ).toThrow();
  });
});
