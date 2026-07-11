import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { BridgeMessageLogEntity } from '@contexts/nodes/infrastructure/persistence/sqlite/entities/bridge-message-log.entity';
import { BridgeMessageLogTypeormRepository } from './bridge-message-log-typeorm.repository';

describe('BridgeMessageLogTypeormRepository', () => {
  let repository: BridgeMessageLogTypeormRepository;
  let typeormRepository: jest.Mocked<Repository<BridgeMessageLogEntity>>;

  const nodeId = '11111111-1111-4111-8111-111111111111';

  function buildAggregate(id?: string) {
    const now = new Date('2026-07-10T10:00:00Z');
    const builder = new BridgeMessageLogBuilder()
      .withId(id ?? UuidValueObject.generate().value)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .withDirection(BridgeMessageDirectionEnum.INBOUND)
      .withType(BridgeMessageTypeEnum.TELEMETRY)
      .withNodeId(nodeId)
      .withSourceTopic(`sensors/${nodeId}/soil-moisture/telemetry`)
      .withDestinationTopic('gardenia-bridge.telemetry')
      .withRawPayload('{}')
      .withOutcome(BridgeMessageOutcomeEnum.SUCCESS)
      .withProcessedAt('2026-07-10T10:00:00Z');

    const aggregate = builder.build();
    aggregate.record();
    return aggregate;
  }

  beforeEach(() => {
    typeormRepository = {
      insert: jest.fn(),
    } as unknown as jest.Mocked<Repository<BridgeMessageLogEntity>>;
    repository = new BridgeMessageLogTypeormRepository(typeormRepository);
  });

  it('inserts the aggregate with a generated id when none is provided', async () => {
    await repository.save(buildAggregate());

    expect(typeormRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
        direction: 'inbound',
        nodeId,
        outcome: 'success',
      }),
    );
  });

  it('uses the provided id when present', async () => {
    const fixedId = '22222222-2222-4222-8222-222222222222';

    await repository.save(buildAggregate(fixedId));

    expect(typeormRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: fixedId }),
    );
  });

  it('logs and does not throw when the insert fails', async () => {
    typeormRepository.insert.mockRejectedValue(new Error('disk full'));

    await expect(repository.save(buildAggregate())).resolves.toBeUndefined();
  });
});
