import { registerAs } from '@nestjs/config';
import {
  IKafkaConfig,
  IKafkaSaslConfig,
  KafkaSaslMechanism,
} from '@sisques-labs/nestjs-kit/messaging';

/**
 * Kafka configuration for the domain-event forwarder.
 *
 * Forwarding is **opt-in** via `KAFKA_ENABLED` so the app boots without a broker
 * in local/dev/test. When disabled, `MessagingModule` registers a no-op publisher
 * and never opens a connection.
 */
function parseBrokers(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map((broker) => broker.trim())
    .filter((broker) => broker.length > 0);
}

function resolveSasl(): IKafkaSaslConfig | null {
  const username = process.env.KAFKA_SASL_USERNAME?.trim();
  const password = process.env.KAFKA_SASL_PASSWORD?.trim();
  if (!username || !password) {
    return null;
  }
  const mechanism = (process.env.KAFKA_SASL_MECHANISM?.trim() ||
    'plain') as KafkaSaslMechanism;
  return { mechanism, username, password };
}

export const kafkaConfig = registerAs('kafka', (): IKafkaConfig => {
  return {
    enabled: process.env.KAFKA_ENABLED === 'true',
    clientId: process.env.KAFKA_CLIENT_ID?.trim() || 'nestjs-template',
    brokers: parseBrokers(process.env.KAFKA_BROKERS),
    topicPrefix: process.env.KAFKA_TOPIC_PREFIX?.trim() || 'nestjs-template',
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: resolveSasl(),
  };
});
