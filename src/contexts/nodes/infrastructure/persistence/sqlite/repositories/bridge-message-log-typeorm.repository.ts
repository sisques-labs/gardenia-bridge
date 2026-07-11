import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { BridgeMessageLogAggregate } from '@contexts/nodes/domain/aggregates/bridge-message-log.aggregate';
import { IBridgeMessageLogWriteRepository } from '@contexts/nodes/domain/repositories/write/bridge-message-log-write.repository';
import { BridgeMessageLogEntity } from '@contexts/nodes/infrastructure/persistence/sqlite/entities/bridge-message-log.entity';

@Injectable()
export class BridgeMessageLogTypeormRepository implements IBridgeMessageLogWriteRepository {
  private readonly logger = new Logger(BridgeMessageLogTypeormRepository.name);

  constructor(
    @InjectRepository(BridgeMessageLogEntity, 'sqlite-audit')
    private readonly repository: Repository<BridgeMessageLogEntity>,
  ) {}

  async save(aggregate: BridgeMessageLogAggregate): Promise<void> {
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
  }
}
