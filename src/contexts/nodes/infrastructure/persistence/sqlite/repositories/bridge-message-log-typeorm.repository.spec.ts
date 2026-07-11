import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

import { BridgeMessageLogAggregate } from '@contexts/nodes/domain/aggregates/bridge-message-log.aggregate';
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

  const entity: BridgeMessageLogEntity = {
    id: '33333333-3333-4333-8333-333333333333',
    direction: 'inbound',
    type: 'telemetry',
    nodeId,
    sourceTopic: `sensors/${nodeId}/soil-moisture/telemetry`,
    destinationTopic: 'gardenia-bridge.telemetry',
    rawPayload: '{}',
    outcome: 'success',
    errorReason: null,
    processedAt: '2026-07-10T10:00:00Z',
    createdAt: '2026-07-10T10:00:00.000Z',
    updatedAt: '2026-07-10T10:00:00.000Z',
  };

  function buildAggregate(id?: string): BridgeMessageLogAggregate {
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
      findOneBy: jest.fn(),
      findAndCount: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<Repository<BridgeMessageLogEntity>>;
    repository = new BridgeMessageLogTypeormRepository(
      typeormRepository,
      new BridgeMessageLogBuilder(),
    );
  });

  describe('save()', () => {
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

    it('returns the aggregate and does not throw when the insert fails', async () => {
      typeormRepository.insert.mockRejectedValue(new Error('disk full'));
      const aggregate = buildAggregate();

      await expect(repository.save(aggregate)).resolves.toBe(aggregate);
    });

    it('returns the aggregate on success', async () => {
      const aggregate = buildAggregate();

      await expect(repository.save(aggregate)).resolves.toBe(aggregate);
    });
  });

  describe('findById()', () => {
    it('returns the hydrated aggregate when the row exists', async () => {
      typeormRepository.findOneBy.mockResolvedValue(entity);

      const found = await repository.findById(entity.id);

      expect(found).toBeInstanceOf(BridgeMessageLogAggregate);
      expect(found?.toPrimitives()).toMatchObject({
        id: entity.id,
        direction: entity.direction,
        nodeId: entity.nodeId,
      });
    });

    it('returns null when the row does not exist', async () => {
      typeormRepository.findOneBy.mockResolvedValue(null);

      await expect(repository.findById('missing')).resolves.toBeNull();
    });
  });

  describe('findByCriteria()', () => {
    it('returns a paginated result hydrated from every matching row', async () => {
      typeormRepository.findAndCount.mockResolvedValue([[entity], 1]);

      const result = await repository.findByCriteria({} as never);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBeInstanceOf(BridgeMessageLogAggregate);
      expect(result.total).toBe(1);
    });
  });

  describe('delete()', () => {
    it('deletes the row by id', async () => {
      await repository.delete(entity.id);

      expect(typeormRepository.delete).toHaveBeenCalledWith(entity.id);
    });
  });
});
