import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  BaseDatabaseRepository,
  Criteria,
  PaginatedResult,
} from '@sisques-labs/nestjs-kit';
import { Repository } from 'typeorm';

import { BridgeMessageLogAggregate } from '@contexts/nodes/domain/aggregates/bridge-message-log.aggregate';
import { BridgeMessageLogBuilder } from '@contexts/nodes/domain/builders/bridge-message-log.builder';
import { IBridgeMessageLogWriteRepository } from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { BridgeMessageLogEntity } from '@contexts/nodes/infrastructure/persistence/sqlite/entities/bridge-message-log.entity';

@Injectable()
export class BridgeMessageLogTypeormRepository
  extends BaseDatabaseRepository
  implements IBridgeMessageLogWriteRepository
{
  protected logger = new Logger(BridgeMessageLogTypeormRepository.name);

  constructor(
    @InjectRepository(BridgeMessageLogEntity, 'sqlite-audit')
    private readonly repository: Repository<BridgeMessageLogEntity>,
    private readonly bridgeMessageLogBuilder: BridgeMessageLogBuilder,
  ) {
    super();
  }

  // Best-effort write: a broken audit log must never block the relay, so
  // failures are logged and swallowed rather than rethrown.
  async save(
    aggregate: BridgeMessageLogAggregate,
  ): Promise<BridgeMessageLogAggregate> {
    const primitives = aggregate.toPrimitives();

    try {
      await this.repository.insert({
        id: primitives.id,
        direction: primitives.direction,
        type: primitives.type,
        nodeId: primitives.nodeId,
        sourceTopic: primitives.sourceTopic,
        destinationTopic: primitives.destinationTopic,
        rawPayload: primitives.rawPayload,
        outcome: primitives.outcome,
        errorReason: primitives.errorReason,
        processedAt: primitives.processedAt,
        createdAt: primitives.createdAt.toISOString(),
        updatedAt: primitives.updatedAt.toISOString(),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to write bridge message audit log: ${reason}`);
    }

    return aggregate;
  }

  async findById(id: string): Promise<BridgeMessageLogAggregate | null> {
    const entity = await this.repository.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByCriteria(
    _criteria: Criteria,
  ): Promise<PaginatedResult<BridgeMessageLogAggregate>> {
    const [entities, total] = await this.repository.findAndCount();
    const items = entities.map((entity) => this.toDomain(entity));
    return new PaginatedResult(items, total, 1, entities.length || 20);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }

  private toDomain(entity: BridgeMessageLogEntity): BridgeMessageLogAggregate {
    return this.bridgeMessageLogBuilder
      .withId(entity.id)
      .withCreatedAt(new Date(entity.createdAt))
      .withUpdatedAt(new Date(entity.updatedAt))
      .withDirection(entity.direction)
      .withType(entity.type)
      .withNodeId(entity.nodeId)
      .withSourceTopic(entity.sourceTopic)
      .withDestinationTopic(entity.destinationTopic)
      .withRawPayload(entity.rawPayload)
      .withOutcome(entity.outcome)
      .withErrorReason(entity.errorReason)
      .withProcessedAt(entity.processedAt)
      .build();
  }
}
