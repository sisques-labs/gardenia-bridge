import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageOutcomeValueObject } from './bridge-message-outcome.value-object';

describe('BridgeMessageOutcomeValueObject', () => {
  it.each(Object.values(BridgeMessageOutcomeEnum))(
    'accepts valid outcome: %s',
    (outcome) => {
      expect(() => new BridgeMessageOutcomeValueObject(outcome)).not.toThrow();
    },
  );

  it('throws for an invalid outcome value', () => {
    expect(
      () =>
        new BridgeMessageOutcomeValueObject(
          'partial' as BridgeMessageOutcomeEnum,
        ),
    ).toThrow();
  });
});
