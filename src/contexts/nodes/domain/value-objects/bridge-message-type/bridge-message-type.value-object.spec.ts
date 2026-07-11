import { BridgeMessageTypeEnum } from '../../enums/bridge-message-type.enum';
import { BridgeMessageTypeValueObject } from './bridge-message-type.value-object';

describe('BridgeMessageTypeValueObject', () => {
  it.each(Object.values(BridgeMessageTypeEnum))(
    'accepts valid type: %s',
    (type) => {
      expect(() => new BridgeMessageTypeValueObject(type)).not.toThrow();
    },
  );

  it('throws for an invalid type value', () => {
    expect(
      () => new BridgeMessageTypeValueObject('bogus' as BridgeMessageTypeEnum),
    ).toThrow();
  });

  it('throws for an empty value', () => {
    expect(
      () => new BridgeMessageTypeValueObject('' as BridgeMessageTypeEnum),
    ).toThrow();
  });

  it('supports is() checks against the enum', () => {
    const vo = new BridgeMessageTypeValueObject(
      BridgeMessageTypeEnum.TELEMETRY,
    );

    expect(vo.is(BridgeMessageTypeEnum.TELEMETRY)).toBe(true);
    expect(vo.is(BridgeMessageTypeEnum.HEARTBEAT)).toBe(false);
  });
});
