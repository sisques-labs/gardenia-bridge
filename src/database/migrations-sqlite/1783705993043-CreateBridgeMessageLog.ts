import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateBridgeMessageLog1783705993043 implements MigrationInterface {
  name = 'CreateBridgeMessageLog1783705993043';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'bridge_message_log',
        columns: [
          { name: 'id', type: 'text', isPrimary: true },
          { name: 'direction', type: 'text' },
          { name: 'type', type: 'text' },
          { name: 'node_id', type: 'text', isNullable: true },
          { name: 'source_topic', type: 'text' },
          { name: 'destination_topic', type: 'text', isNullable: true },
          { name: 'raw_payload', type: 'text' },
          { name: 'outcome', type: 'text' },
          { name: 'error_reason', type: 'text', isNullable: true },
          { name: 'processed_at', type: 'text' },
        ],
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('bridge_message_log');
  }
}
