import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ForwardCommandToNodeHandler } from './application/commands/forward-command-to-node/forward-command-to-node.handler';
import { ForwardNodeEventToKafkaHandler } from './application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.handler';
import { BridgeMessageLogBuilder } from './domain/builders/bridge-message-log.builder';
import { BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY } from './domain/repositories/write/bridge-message-log-write.repository';
import { BridgeKafkaHealthIndicator } from './infrastructure/health/bridge-kafka.health-indicator';
import { MqttHealthIndicator } from './infrastructure/health/mqtt.health-indicator';
import { KafkaBridgeCommandsConsumerService } from './infrastructure/kafka/kafka-bridge-commands-consumer.service';
import { KafkaBridgeProducerService } from './infrastructure/kafka/kafka-bridge-producer.service';
import { MqttClientProvider } from './infrastructure/mqtt/mqtt-client.provider';
import { MqttCommandPublisherService } from './infrastructure/mqtt/mqtt-command-publisher.service';
import { MqttNodeListenerService } from './infrastructure/mqtt/mqtt-node-listener.service';
import { BridgeMessageLogEntity } from './infrastructure/persistence/sqlite/entities/bridge-message-log.entity';
import { BridgeMessageLogTypeormRepository } from './infrastructure/persistence/sqlite/repositories/bridge-message-log-typeorm.repository';

const COMMAND_HANDLERS = [
  ForwardNodeEventToKafkaHandler,
  ForwardCommandToNodeHandler,
];

const DOMAIN_BUILDERS = [BridgeMessageLogBuilder];

const INFRASTRUCTURE_REPOSITORIES = [
  {
    provide: BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY,
    useClass: BridgeMessageLogTypeormRepository,
  },
];

// Message-broker client services: connect on module init, expose
// send/publish + connection-state, and are the entry points that dispatch
// commands (MqttNodeListenerService, KafkaBridgeCommandsConsumerService).
const INFRASTRUCTURE_SERVICES = [
  MqttClientProvider,
  MqttNodeListenerService,
  MqttCommandPublisherService,
  KafkaBridgeProducerService,
  KafkaBridgeCommandsConsumerService,
];

// Exposed so HealthModule can compose them into GET /api/health/ready — the
// one deliberate exception to "core never imports a context": health
// readiness is a composition-root concern, not a business dependency (see
// src/contexts/nodes/README.md).
const HEALTH_INDICATORS = [MqttHealthIndicator, BridgeKafkaHealthIndicator];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([BridgeMessageLogEntity], 'sqlite-audit'),
  ],
  providers: [
    ...COMMAND_HANDLERS,
    ...DOMAIN_BUILDERS,
    ...INFRASTRUCTURE_REPOSITORIES,
    ...INFRASTRUCTURE_SERVICES,
    ...HEALTH_INDICATORS,
  ],
  exports: [...HEALTH_INDICATORS],
})
export class NodesModule {}
