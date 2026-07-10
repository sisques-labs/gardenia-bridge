import { Repository } from 'typeorm';

import { IBridgeMessageLogEntry } from '../../../../domain/interfaces/bridge-message-log-entry.interface';
import { BridgeMessageLogEntity } from '../entities/bridge-message-log.entity';
import { BridgeMessageLogTypeormRepository } from './bridge-message-log-typeorm.repository';

describe('BridgeMessageLogTypeormRepository', () => {
  let repository: BridgeMessageLogTypeormRepository;
  let typeormRepository: jest.Mocked<Repository<BridgeMessageLogEntity>>;

  const entry: IBridgeMessageLogEntry = {
    direction: 'inbound',
    type: 'telemetry' as never,
    nodeId: 'node-1',
    sourceTopic: 'sensors/node-1/soil-moisture/telemetry',
    destinationTopic: 'gardenia-bridge.telemetry',
    rawPayload: '{}',
    outcome: 'success',
    errorReason: null,
    processedAt: '2026-07-10T10:00:00Z',
  };

  beforeEach(() => {
    typeormRepository = {
      insert: jest.fn(),
    } as unknown as jest.Mocked<Repository<BridgeMessageLogEntity>>;
    repository = new BridgeMessageLogTypeormRepository(typeormRepository);
  });

  it('inserts the entry with a generated id when none is provided', async () => {
    await repository.record(entry);

    expect(typeormRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        ),
        direction: 'inbound',
        nodeId: 'node-1',
        outcome: 'success',
      }),
    );
  });

  it('uses the provided id when present', async () => {
    await repository.record({ ...entry, id: 'fixed-id' });

    expect(typeormRepository.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'fixed-id' }),
    );
  });

  it('logs and does not throw when the insert fails', async () => {
    typeormRepository.insert.mockRejectedValue(new Error('disk full'));

    await expect(repository.record(entry)).resolves.toBeUndefined();
  });
});
