import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { DataSource } from 'typeorm';

import { BridgeMessageLogEntity } from '../../../src/contexts/nodes/infrastructure/persistence/sqlite/entities/bridge-message-log.entity';
import { BridgeMessageLogTypeormRepository } from '../../../src/contexts/nodes/infrastructure/persistence/sqlite/repositories/bridge-message-log-typeorm.repository';

describe('BridgeMessageLog — SQLite integration', () => {
  let dataSource: DataSource;
  let repository: BridgeMessageLogTypeormRepository;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = mkdtempSync(join(tmpdir(), 'bridge-audit-'));
    const dbPath = join(tmpDir, 'bridge-audit.sqlite');

    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      entities: [BridgeMessageLogEntity],
      synchronize: true,
      logging: false,
    });
    await dataSource.initialize();

    repository = new BridgeMessageLogTypeormRepository(
      dataSource.getRepository(BridgeMessageLogEntity),
    );
  });

  afterAll(async () => {
    await dataSource.destroy();
    if (existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('persists a successful entry and reads it back field-for-field', async () => {
    await repository.record({
      id: 'entry-success',
      direction: 'inbound',
      type: 'telemetry' as never,
      nodeId: 'node-1',
      sourceTopic: 'sensors/node-1/soil-moisture/telemetry',
      destinationTopic: 'gardenia-bridge.telemetry',
      rawPayload: '{"value":42.5}',
      outcome: 'success',
      errorReason: null,
      processedAt: '2026-07-10T10:00:00.000Z',
    });

    const row = await dataSource
      .getRepository(BridgeMessageLogEntity)
      .findOneBy({ id: 'entry-success' });

    expect(row).toMatchObject({
      id: 'entry-success',
      direction: 'inbound',
      type: 'telemetry',
      nodeId: 'node-1',
      sourceTopic: 'sensors/node-1/soil-moisture/telemetry',
      destinationTopic: 'gardenia-bridge.telemetry',
      rawPayload: '{"value":42.5}',
      outcome: 'success',
      errorReason: null,
      processedAt: '2026-07-10T10:00:00.000Z',
    });
  });

  it('persists a malformed-payload error entry with null nodeId/destinationTopic', async () => {
    await repository.record({
      id: 'entry-error',
      direction: 'inbound',
      type: 'unknown',
      nodeId: null,
      sourceTopic: 'unknown/topic',
      destinationTopic: null,
      rawPayload: 'not-json',
      outcome: 'error',
      errorReason: 'Unrecognized MQTT topic pattern: "unknown/topic"',
      processedAt: '2026-07-10T10:00:01.000Z',
    });

    const row = await dataSource
      .getRepository(BridgeMessageLogEntity)
      .findOneBy({ id: 'entry-error' });

    expect(row).toMatchObject({
      id: 'entry-error',
      type: 'unknown',
      nodeId: null,
      destinationTopic: null,
      outcome: 'error',
      errorReason: 'Unrecognized MQTT topic pattern: "unknown/topic"',
    });
  });

  it('generates a uuid when no id is provided', async () => {
    await repository.record({
      direction: 'outbound',
      type: 'command' as never,
      nodeId: 'node-2',
      sourceTopic: 'gardenia-bridge.commands',
      destinationTopic: 'nodes/node-2/commands',
      rawPayload: '{"commandId":"cmd-1"}',
      outcome: 'success',
      errorReason: null,
      processedAt: '2026-07-10T10:00:02.000Z',
    });

    const rows = await dataSource
      .getRepository(BridgeMessageLogEntity)
      .findBy({ nodeId: 'node-2' });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
