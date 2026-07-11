import { existsSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { UuidValueObject } from '@sisques-labs/nestjs-kit';
import { DataSource } from 'typeorm';

import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { BridgeMessageDirectionEnum } from '@contexts/nodes/domain/enums/bridge-message-direction.enum';
import { BridgeMessageOutcomeEnum } from '@contexts/nodes/domain/enums/bridge-message-outcome.enum';
import { BridgeMessageTypeEnum } from '@contexts/nodes/domain/enums/bridge-message-type.enum';
import { BridgeMessageLogEntity } from '@contexts/nodes/infrastructure/persistence/sqlite/entities/bridge-message-log.entity';
import { BridgeMessageLogTypeormRepository } from '@contexts/nodes/infrastructure/persistence/sqlite/repositories/bridge-message-log-typeorm.repository';

describe('BridgeMessageLog — SQLite integration', () => {
  let dataSource: DataSource;
  let repository: BridgeMessageLogTypeormRepository;
  let tmpDir: string;

  const successNodeId = '11111111-1111-4111-8111-111111111111';
  const generatedNodeId = '22222222-2222-4222-8222-222222222222';

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
    const now = new Date('2026-07-10T10:00:00.000Z');
    const aggregate = new BridgeMessageLogBuilder()
      .withId('33333333-3333-4333-8333-333333333333')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .withDirection(BridgeMessageDirectionEnum.INBOUND)
      .withType(BridgeMessageTypeEnum.TELEMETRY)
      .withNodeId(successNodeId)
      .withSourceTopic(`sensors/${successNodeId}/soil-moisture/telemetry`)
      .withDestinationTopic('gardenia-bridge.telemetry')
      .withRawPayload('{"value":42.5}')
      .withOutcome(BridgeMessageOutcomeEnum.SUCCESS)
      .withProcessedAt('2026-07-10T10:00:00.000Z')
      .build();
    aggregate.record();

    await repository.save(aggregate);

    const row = await dataSource
      .getRepository(BridgeMessageLogEntity)
      .findOneBy({ id: '33333333-3333-4333-8333-333333333333' });

    expect(row).toMatchObject({
      id: '33333333-3333-4333-8333-333333333333',
      direction: 'inbound',
      type: 'telemetry',
      nodeId: successNodeId,
      sourceTopic: `sensors/${successNodeId}/soil-moisture/telemetry`,
      destinationTopic: 'gardenia-bridge.telemetry',
      rawPayload: '{"value":42.5}',
      outcome: 'success',
      errorReason: null,
      processedAt: '2026-07-10T10:00:00.000Z',
    });
  });

  it('persists a malformed-payload error entry with null nodeId/destinationTopic', async () => {
    const now = new Date('2026-07-10T10:00:01.000Z');
    const aggregate = new BridgeMessageLogBuilder()
      .withId('44444444-4444-4444-8444-444444444444')
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .withDirection(BridgeMessageDirectionEnum.INBOUND)
      .withType(BridgeMessageTypeEnum.UNKNOWN)
      .withNodeId(null)
      .withSourceTopic('unknown/topic')
      .withDestinationTopic(null)
      .withRawPayload('not-json')
      .withOutcome(BridgeMessageOutcomeEnum.ERROR)
      .withErrorReason('Unrecognized MQTT topic pattern: "unknown/topic"')
      .withProcessedAt('2026-07-10T10:00:01.000Z')
      .build();
    aggregate.record();

    await repository.save(aggregate);

    const row = await dataSource
      .getRepository(BridgeMessageLogEntity)
      .findOneBy({ id: '44444444-4444-4444-8444-444444444444' });

    expect(row).toMatchObject({
      id: '44444444-4444-4444-8444-444444444444',
      type: 'unknown',
      nodeId: null,
      destinationTopic: null,
      outcome: 'error',
      errorReason: 'Unrecognized MQTT topic pattern: "unknown/topic"',
    });
  });

  it('persists an aggregate built with a freshly generated uuid', async () => {
    const now = new Date('2026-07-10T10:00:02.000Z');
    const aggregate = new BridgeMessageLogBuilder()
      .withId(UuidValueObject.generate().value)
      .withCreatedAt(now)
      .withUpdatedAt(now)
      .withDirection(BridgeMessageDirectionEnum.OUTBOUND)
      .withType(BridgeMessageTypeEnum.COMMAND)
      .withNodeId(generatedNodeId)
      .withSourceTopic('gardenia-bridge.commands')
      .withDestinationTopic(`nodes/${generatedNodeId}/commands`)
      .withRawPayload('{"commandId":"cmd-1"}')
      .withOutcome(BridgeMessageOutcomeEnum.SUCCESS)
      .withProcessedAt('2026-07-10T10:00:02.000Z')
      .build();
    aggregate.record();

    await repository.save(aggregate);

    const rows = await dataSource
      .getRepository(BridgeMessageLogEntity)
      .findBy({ nodeId: generatedNodeId });

    expect(rows).toHaveLength(1);
    expect(rows[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });
});
