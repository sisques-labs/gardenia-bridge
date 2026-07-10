import { randomUUID } from 'node:crypto';

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IBridgeMessageLogEntry } from '../../../../domain/interfaces/bridge-message-log-entry.interface';
import { IBridgeMessageLogWriteRepository } from '../../../../domain/repositories/write/bridge-message-log-write.repository';
import { BridgeMessageLogEntity } from '../entities/bridge-message-log.entity';

@Injectable()
export class BridgeMessageLogTypeormRepository implements IBridgeMessageLogWriteRepository {
  private readonly logger = new Logger(BridgeMessageLogTypeormRepository.name);

  constructor(
    @InjectRepository(BridgeMessageLogEntity, 'sqlite-audit')
    private readonly repository: Repository<BridgeMessageLogEntity>,
  ) {}

  async record(entry: IBridgeMessageLogEntry): Promise<void> {
    try {
      await this.repository.insert({
        id: entry.id ?? randomUUID(),
        direction: entry.direction,
        type: entry.type,
        nodeId: entry.nodeId,
        sourceTopic: entry.sourceTopic,
        destinationTopic: entry.destinationTopic,
        rawPayload: entry.rawPayload,
        outcome: entry.outcome,
        errorReason: entry.errorReason,
        processedAt: entry.processedAt,
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to write bridge message audit log: ${reason}`);
    }
  }
}
