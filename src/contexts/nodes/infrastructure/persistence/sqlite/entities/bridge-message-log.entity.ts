import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('bridge_message_log')
export class BridgeMessageLogEntity {
  @PrimaryColumn({ name: 'id', type: 'text' })
  id!: string;

  @Column({ name: 'direction', type: 'text' })
  direction!: string;

  @Column({ name: 'type', type: 'text' })
  type!: string;

  @Column({ name: 'node_id', type: 'text', nullable: true })
  nodeId!: string | null;

  @Column({ name: 'source_topic', type: 'text' })
  sourceTopic!: string;

  @Column({ name: 'destination_topic', type: 'text', nullable: true })
  destinationTopic!: string | null;

  @Column({ name: 'raw_payload', type: 'text' })
  rawPayload!: string;

  @Column({ name: 'outcome', type: 'text' })
  outcome!: string;

  @Column({ name: 'error_reason', type: 'text', nullable: true })
  errorReason!: string | null;

  @Column({ name: 'processed_at', type: 'text' })
  processedAt!: string;

  @Column({ name: 'created_at', type: 'text' })
  createdAt!: string;

  @Column({ name: 'updated_at', type: 'text' })
  updatedAt!: string;
}
