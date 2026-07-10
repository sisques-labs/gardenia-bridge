import { KafkaBridgeCommandsConsumerService } from '../kafka/kafka-bridge-commands-consumer.service';
import { KafkaBridgeProducerService } from '../kafka/kafka-bridge-producer.service';
import { BridgeKafkaHealthIndicator } from './bridge-kafka.health-indicator';

describe('BridgeKafkaHealthIndicator', () => {
  let indicator: BridgeKafkaHealthIndicator;
  let producer: jest.Mocked<KafkaBridgeProducerService>;
  let consumer: jest.Mocked<KafkaBridgeCommandsConsumerService>;

  beforeEach(() => {
    producer = {
      isConnected: jest.fn(),
    } as unknown as jest.Mocked<KafkaBridgeProducerService>;
    consumer = {
      isConnected: jest.fn(),
    } as unknown as jest.Mocked<KafkaBridgeCommandsConsumerService>;
    indicator = new BridgeKafkaHealthIndicator(producer, consumer);
  });

  it('reports up when both producer and consumer are connected', () => {
    producer.isConnected.mockReturnValue(true);
    consumer.isConnected.mockReturnValue(true);

    expect(indicator.check('bridgeKafka')).toEqual({
      bridgeKafka: { status: 'up' },
    });
  });

  it('reports down when the producer is disconnected', () => {
    producer.isConnected.mockReturnValue(false);
    consumer.isConnected.mockReturnValue(true);

    expect(indicator.check('bridgeKafka')).toEqual({
      bridgeKafka: { status: 'down' },
    });
  });

  it('reports down when the consumer is disconnected', () => {
    producer.isConnected.mockReturnValue(true);
    consumer.isConnected.mockReturnValue(false);

    expect(indicator.check('bridgeKafka')).toEqual({
      bridgeKafka: { status: 'down' },
    });
  });
});
