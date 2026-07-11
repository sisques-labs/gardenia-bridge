# `nodes` — Kafka ↔ MQTT bridge for IoT node traffic

Stateless, best-effort message relay between an MQTT broker (where physical
nodes/sensors publish and subscribe) and Kafka (where the rest of the
platform lives). No device registry, no business GraphQL/REST/MCP transport.
Full rationale in `openspec/changes/kafka-mqtt-bridge/{proposal,design}.md`.

## Message types

| Type | Direction | MQTT topic | Kafka topic |
|---|---|---|---|
| `telemetry` | node → Kafka | `sensors/{nodeId}/{sensorType}/telemetry` | `${KAFKA_TOPIC_PREFIX}.telemetry` |
| `heartbeat` | node → Kafka | `nodes/{nodeId}/heartbeat` | `${KAFKA_TOPIC_PREFIX}.heartbeat` |
| `command-ack` | node → Kafka | `nodes/{nodeId}/commands/ack` | `${KAFKA_TOPIC_PREFIX}.command-acks` |
| `command` | Kafka → node | `nodes/{nodeId}/commands` | `${KAFKA_TOPIC_PREFIX}.commands` |

Every message shares an envelope (`type`, `nodeId`, `timestamp`) plus
type-specific fields — see `domain/interfaces/` for the VO-typed domain shape
and `domain/primitives/` for the parallel primitives-only shape used at the
validation boundary. Payloads are validated with Zod
(`infrastructure/validation/schemas/`) into primitives; the primitives are
wrapped into Value Objects one layer in, at the CQRS Command's constructor
(`domain/factories/*.factory.ts` does the wrapping). A message that fails
validation is never relayed and is recorded in the audit log with an error
outcome instead.

Kafka messages are keyed by `nodeId` (per-node ordering, no global ordering
guarantee). Delivery is best-effort: MQTT QoS 0/1, no retries, no
dead-letter queue.

## Commands

Two CQRS commands, dispatched via `CommandBus` from the two infra entry
points (`MqttNodeListenerService` for inbound MQTT messages,
`KafkaBridgeCommandsConsumerService` for inbound Kafka messages):

- `ForwardNodeEventToKafkaCommand` — relays a validated `telemetry` /
  `heartbeat` / `command-ack` message to its Kafka topic
  (`KafkaBridgeProducerService`), then writes an audit log row.
- `ForwardCommandToNodeCommand` — relays a validated `command` message to
  `nodes/{nodeId}/commands` over MQTT (`MqttCommandPublisherService`), then
  writes an audit log row.

Both handlers catch producer/publisher failures, record an error outcome in
the audit log, and swallow the error — a broker hiccup on one message must
not crash the listener/consumer or block the next message.

## Audit log

Every message processed (either direction, success or failure) gets exactly
one row in `bridge_message_log`, a local SQLite table on its own TypeORM
connection (`sqlite-audit`, `better-sqlite3` driver, path configured via
`BRIDGE_AUDIT_DB_PATH`) — independent of the main Postgres connection, so the
bridge can run at the edge without depending on it. Modeled as a full
`BridgeMessageLogAggregate` (`domain/aggregates/`): `record()` emits a
`BridgeMessageRecordedEvent`, published through the usual
`BaseCommandHandler.publishEvents()` → `EventBus` pipeline, and also
auto-forwarded to `${KAFKA_TOPIC_PREFIX}.nodes` by the kit's `MessagingModule`
outbox (see `aggregate-module.map.generated.ts`) — free external
observability into the audit trail, on top of the write itself. Write-only in
this version: no read API, no retention policy (see design.md Open
Questions).

## Deviations from the standard architecture-skill pattern

This is the first bounded context in `gardenia-bridge`, so it sets
precedent — but it deliberately does **not** follow every piece of the
DDD+CQRS ceremony this template's `architecture` skill describes for typical
persisted, transport-facing contexts:

- **No aggregate for the relayed messages themselves** (telemetry, heartbeat,
  command, command-ack) — they're transient, re-validated on every hop, never
  persisted. They're still fully VO-typed though (`domain/value-objects/`);
  VOs and aggregates are independent decisions in this org's convention. The
  audit log (`BridgeMessageLog`) *is* a full aggregate — see above.
- **No `transport/` subtree.** Entry points are an MQTT subscription
  callback and a Kafka consumer — both infrastructure, not the
  GraphQL/REST/MCP transport this template usually means by that layer.
- **Health indicators live here, not in `src/core/health/`.** They need
  `MqttClientProvider` / `KafkaBridgeProducerService` /
  `KafkaBridgeCommandsConsumerService` connection state, which is this
  context's knowledge. `NodesModule` exports them; `HealthModule` (in
  `src/core/health/`) imports `NodesModule` to compose them into
  `GET /api/health/ready` alongside the Postgres check. This is a
  **deliberate exception** to "core never imports a context" — health/
  readiness composition is a composition-root concern, not a business
  dependency, and doesn't leak this context's domain/application logic into
  core.

See `openspec/changes/kafka-mqtt-bridge/design.md` for the full "what
applies / what doesn't" table and the reasoning behind each deviation.
