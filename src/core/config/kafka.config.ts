import { registerAs } from '@nestjs/config';
import {
  IKafkaConfig,
  IKafkaSaslConfig,
  KafkaSaslMechanism,
} from '@sisques-labs/nestjs-kit/messaging';

/**
 * Topics the `nodes` bridge context produces/consumes, layered on top of the
 * domain-event-forwarder's IKafkaConfig (same broker/connection settings,
 * different topics — see openspec/changes/kafka-mqtt-bridge/design.md).
 */
export interface IBridgeKafkaConfig extends IKafkaConfig {
  bridgeTelemetryTopic: string;
  bridgeHeartbeatTopic: string;
  bridgeCommandAcksTopic: string;
  bridgeCommandsTopic: string;
}

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

export const kafkaConfig = registerAs('kafka', (): IBridgeKafkaConfig => {
  const topicPrefix =
    process.env.KAFKA_TOPIC_PREFIX?.trim() || 'gardenia-bridge';

  return {
    enabled: process.env.KAFKA_ENABLED === 'true',
    clientId: process.env.KAFKA_CLIENT_ID?.trim() || 'gardenia-bridge',
    brokers: parseBrokers(process.env.KAFKA_BROKERS),
    topicPrefix,
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: resolveSasl(),
    bridgeTelemetryTopic:
      process.env.KAFKA_BRIDGE_TELEMETRY_TOPIC?.trim() ||
      `${topicPrefix}.telemetry`,
    bridgeHeartbeatTopic:
      process.env.KAFKA_BRIDGE_HEARTBEAT_TOPIC?.trim() ||
      `${topicPrefix}.heartbeat`,
    bridgeCommandAcksTopic:
      process.env.KAFKA_BRIDGE_COMMAND_ACKS_TOPIC?.trim() ||
      `${topicPrefix}.command-acks`,
    bridgeCommandsTopic:
      process.env.KAFKA_BRIDGE_COMMANDS_TOPIC?.trim() ||
      `${topicPrefix}.commands`,
  };
});
