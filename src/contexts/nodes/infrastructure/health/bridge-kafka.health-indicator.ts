import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

import { KafkaBridgeCommandsConsumerService } from '../kafka/kafka-bridge-commands-consumer.service';
import { KafkaBridgeProducerService } from '../kafka/kafka-bridge-producer.service';

@Injectable()
export class BridgeKafkaHealthIndicator extends HealthIndicator {
  constructor(
    private readonly kafkaBridgeProducer: KafkaBridgeProducerService,
    private readonly kafkaBridgeCommandsConsumer: KafkaBridgeCommandsConsumerService,
  ) {
    super();
  }

  check(key: string): HealthIndicatorResult {
    const isHealthy =
      this.kafkaBridgeProducer.isConnected() &&
      this.kafkaBridgeCommandsConsumer.isConnected();
    return this.getStatus(key, isHealthy);
  }
}
