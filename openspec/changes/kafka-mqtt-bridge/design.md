# Design: Kafka ↔ MQTT Bridge (`nodes`)

## Technical Approach

`nodes` is a message-relay context: two inbound entry points (an MQTT
subscriber, a Kafka consumer), two outbound sinks (a Kafka producer, an MQTT
publisher), and a side-effect audit write on every message. There is no
persisted business entity to protect with aggregates/invariants/events — the
"domain" here is the *shape* of a message, not a lifecycle.

```
MQTT broker                                          Kafka cluster
  │  sensors/{nodeId}/{sensorType}/telemetry            │
  │  nodes/{nodeId}/heartbeat                           │
  │  nodes/{nodeId}/commands/ack                        │
  ├──────────────► MqttNodeListenerService              │
  │                     │ parse+validate (Zod)          │
  │                     ▼                                │
  │              ForwardNodeEventToKafkaCommand          │
  │                     │                                │
  │                     ├─► KafkaBridgeProducerService ─►│ gardenia-bridge.telemetry
  │                     │                                │  gardenia-bridge.heartbeat
  │                     │                                │  gardenia-bridge.command-acks
  │                     │                                │  (topic resolved from envelope.type)
  │                     └─► BridgeMessageLog (SQLite)     │
  │                                                       │
  │                                        gardenia-bridge.commands
  │                                                       │
  │              ForwardCommandToNodeCommand ◄────────────┤ KafkaBridgeCommandsConsumer
  │                     │ parse+validate (Zod)            │
  │                     ├─► MqttCommandPublisher          │
  │  nodes/{nodeId}/commands                              │
  │◄────────────────────┘                                │
  │                     └─► BridgeMessageLog (SQLite)     │
```

Both commands share the same shape: receive a raw payload from one transport,
validate it against the envelope + type-specific schema, forward it
(unchanged, not enriched) to the other transport, and record the outcome.
Validation failure short-circuits before either the forward or the Kafka
produce/MQTT publish — a malformed message is logged as an error outcome and
never relayed.

## What Applies From the Standard Pattern, and What Doesn't

This is the first context in `gardenia-bridge`, so it sets precedent. Being
explicit about the deviations matters more than usual.

| Standard pattern element | Applies here? | Why |
|---|---|---|
| `domain/interfaces/`, pure TS, zero framework imports | Yes | Message envelope shapes are plain interfaces |
| `domain/enums/` | Yes | `BridgeMessageTypeEnum` |
| `domain/exceptions/` extending `BaseException` | Yes | `InvalidMessagePayloadException` (validation failures) |
| `domain/aggregates/` + `BaseAggregate` + `Builder` + domain events | **No** | No persisted entity with a lifecycle or invariants to protect. Messages are transient; the audit log is a dumb record, not an aggregate (see below) |
| `domain/value-objects/` wrapping every field | **No** | No aggregate ⇒ nothing to wrap. Validation lives in Zod schemas at the infra boundary instead of VO constructors |
| `application/commands/{name}/{name}.command.ts` + `.handler.ts` | Yes | `ForwardNodeEventToKafka`, `ForwardCommandToNode` — orchestration without an aggregate underneath |
| `application/queries/` | **No** | Nothing to query in this change (audit log is write-only; see Out of Scope) |
| `application/services/` (assert-exists, etc.) | **No** | No entity existence to assert; the equivalent concern (payload validity) is a Zod parse, not an assert-service |
| `infrastructure/persistence/typeorm/` | Yes, but a **second, SQLite `DataSource`** | See "Persistence" below |
| `transport/graphql/`, `transport/rest/`, `transport/mcp/` | **No** | This context has no business transport. Entry points are MQTT subscription callbacks and a Kafka consumer, both infrastructure, not transport in the DDD sense used elsewhere in this template |
| `CqrsModule` import, `CommandBus`/`QueryBus`-only dispatch | Yes | Both commands dispatch through `CommandBus`; infra listener services are the only callers |
| NestJS module provider arrays (`COMMAND_HANDLERS`, etc.) | Yes | Same convention, module-local |
| Logging conventions (entry point + I/O boundary logging) | Yes | MQTT message received, Kafka message received/produced, MQTT published — each logged per the existing rule |
| `{context}sFindByCriteria` mandatory pattern | **No** | No query surface exists to trigger this rule |
| Find-by-criteria / GraphQL filter registries | **No** | Same reason |

## Architecture Decisions

| Decision | Choice | Alternatives rejected | Rationale |
|---|---|---|---|
| Domain modeling of messages | Plain `domain/interfaces/*.interface.ts`, validated via Zod at the infra boundary | Full `Aggregate`/VO ceremony per field | Messages aren't persisted, have no lifecycle, and are re-validated on every hop — VOs would wrap values that live for one function call |
| Audit log modeling | Plain entity + write repository, no `Aggregate`/`Builder`/domain events | Full aggregate with `create()` emitting a `BridgeMessageLogged` event | It's an append-only side effect, not a business concept with invariants; there's nothing downstream that needs to react to "a log row was written" |
| Kafka client for bridge topics | `kafkajs` directly, new thin producer/consumer wrappers in `infrastructure/kafka/` | `@sisques-labs/nestjs-kit`'s `MessagingModule` | That module's `aggregateModuleMap` is built for forwarding domain events emitted by CQRS aggregates in *this* service to `{prefix}.{module}` topics — `nodes` emits no domain events and needs producer/consumer control (topic name, key, offsets) `MessagingModule` doesn't expose |
| Kafka topic ownership/prefix | Bridge's own prefix, `gardenia-bridge.*` (not `gardenia-api.*`) | Publish under `gardenia-api`'s prefix | The bridge is the IoT integration boundary; it shouldn't need to know or agree on another service's topic prefix to exist. Any consumer subscribes from outside this repo |
| Inbound topic shape | **One topic per message type from the start**: `gardenia-bridge.telemetry`, `gardenia-bridge.heartbeat`, `gardenia-bridge.command-acks` | A single `gardenia-bridge.events` topic carrying all three, discriminated by `type` | User decision: separate topics from day one. A consumer that only wants heartbeats (e.g. a liveness dashboard) subscribes narrowly instead of pulling telemetry volume and filtering; each topic has one fixed schema instead of a discriminated union, so consumer-side deserialization doesn't need a `switch` on `type` |
| Outbound topic shape | Separate `gardenia-bridge.commands` topic | Folding into an inbound topic with a direction field | Direction changes both the producer and the consumer (node vs. platform); conflating them in one topic would force every consumer to filter both directions even though they only ever care about one |
| Partition key | `nodeId` on all four topics | No key (round-robin); composite key (`nodeId`+`type`) | Guarantees per-node ordering within each topic (a node's telemetry arrives in emission order, independent of its heartbeat/acks/commands) without needing global ordering, which the best-effort v1 doesn't promise anyway |
| Message envelope | `{ type, nodeId, timestamp, ...type-specific fields }`, one discriminated union at the domain/validation level, Zod-validated | Fully separate, unrelated shapes per type with no shared envelope | Even with separate topics, a shared envelope keeps `nodeId`/`timestamp` handling (partition key, audit log fields) uniform across all four message kinds — the topic split is a transport/routing decision, not a reason to abandon a common shape at the domain level |
| Producer topology | One `KafkaBridgeProducerService` (one `kafkajs` `Producer` client) that resolves the destination topic from `envelope.type` via config | Three separate producer service classes, one per topic | The routing logic (`type` → topic name) is a one-line lookup; three near-identical service classes would be boilerplate without a corresponding benefit. The application layer (`ForwardNodeEventToKafkaHandler`) is unaware of the topic split either way — it just calls `producer.send(envelope)` |
| Delivery semantics | Best-effort: MQTT QoS 0/1, no Kafka transactional writes, no retry/backoff, no DLQ | At-least-once with retries + DLQ | Explicit user decision for v1 (telemetry loss tolerance); revisit if a use case needs guaranteed delivery (e.g. safety-critical commands) |
| Node/device auth | None in v1 | Username/password per node; mutual TLS | Explicit user decision (dev/PoC stage). MQTT client config already reads `MQTT_USERNAME`/`MQTT_PASSWORD` from env (unset by default) so broker-level auth can be turned on later without a client code change; per-node identity/authorization is a bigger design (out of scope, see Open Questions) |
| Audit persistence engine | SQLite via a second TypeORM `DataSource` (`better-sqlite3` driver) | (a) Raw `better-sqlite3` with hand-written SQL, no ORM (b) Reuse the existing Postgres connection instead of SQLite | (a) rejected: the template's entity/mapper/migration tooling (`pnpm migration:generate`, entity conventions, repository pattern) already exists for TypeORM — hand-rolled SQL would be a second, inconsistent persistence story for one table. (b) rejected: explicit requirement — the bridge is meant to run at the edge, near the nodes, without depending on network reachability to the central Postgres |
| Audit log query surface | None (write-only in v1) | REST/GraphQL/MCP read endpoints | Not requested; keeps this context transport-free as decided. The SQLite file is directly inspectable (`sqlite3 file.db "select * from bridge_message_log"`) for debugging without shipping an API |
| Command/action payload validation | Envelope + top-level field validation only (`commandId`, `action`, `params` as an opaque object); no per-`action` schema | Registry of per-`action` Zod schemas | The bridge doesn't know what actions exist — that's a `gardenia-api`/firmware-side concern. Validating deeper here would couple the bridge to business semantics it's explicitly not supposed to own |

## Data Flow

```
NODE → KAFKA (telemetry / heartbeat / command-ack)
MQTT publish on sensors/{nodeId}/{sensorType}/telemetry
  or nodes/{nodeId}/heartbeat
  or nodes/{nodeId}/commands/ack
  └─ MqttNodeListenerService.onMessage(topic, payload)
       ├─ resolve message `type` from topic pattern
       ├─ parse payload as JSON; validate against the type's Zod schema
       │    ├─ invalid → BridgeMessageLog.record(direction=inbound, outcome=error) ── stop
       │    └─ valid → envelope
       └─ CommandBus.execute(ForwardNodeEventToKafkaCommand)
            ├─ KafkaBridgeProducerService.send(envelope, key=nodeId)
            │    → topic resolved from envelope.type:
            │        telemetry    → gardenia-bridge.telemetry
            │        heartbeat    → gardenia-bridge.heartbeat
            │        command-ack  → gardenia-bridge.command-acks
            └─ BridgeMessageLog.record(direction=inbound, outcome=success)

KAFKA → NODE (command)
Kafka message on gardenia-bridge.commands
  └─ KafkaBridgeCommandsConsumer.onMessage(message)
       ├─ parse payload as JSON; validate against the `command` Zod schema
       │    ├─ invalid → BridgeMessageLog.record(direction=outbound, outcome=error) ── stop
       │    └─ valid → envelope
       └─ CommandBus.execute(ForwardCommandToNodeCommand)
            ├─ MqttCommandPublisher.publish(topic=nodes/{nodeId}/commands, payload=envelope)
            └─ BridgeMessageLog.record(direction=outbound, outcome=success)
```

## File Changes

All new under `src/contexts/nodes/` unless noted. Tree:

```
domain/
  enums/bridge-message-type.enum.ts        # TELEMETRY | HEARTBEAT | COMMAND | COMMAND_ACK
  interfaces/bridge-message-envelope.interface.ts   # shared { type, nodeId, timestamp }
  interfaces/telemetry-message.interface.ts         # + sensorType, value, unit?
  interfaces/heartbeat-message.interface.ts         # + status?, uptimeSeconds?
  interfaces/command-message.interface.ts           # + commandId, action, params
  interfaces/command-ack-message.interface.ts       # + commandId, success, message?
  interfaces/bridge-message-log-entry.interface.ts  # audit row shape
  exceptions/invalid-message-payload.exception.ts   # 400-equivalent, thrown on Zod failure
  repositories/write/bridge-message-log-write.repository.ts  # port + DI token
application/
  commands/forward-node-event-to-kafka/forward-node-event-to-kafka.command.ts
  commands/forward-node-event-to-kafka/forward-node-event-to-kafka.handler.ts
  commands/forward-command-to-node/forward-command-to-node.command.ts
  commands/forward-command-to-node/forward-command-to-node.handler.ts
infrastructure/
  config/mqtt.config.ts                    # MqttConfig: url, username?, password?, clientId
  config/bridge-kafka.config.ts            # BridgeKafkaConfig: telemetryTopic, heartbeatTopic, commandAcksTopic, commandsTopic (reuses core kafka connection config)
  validation/schemas/bridge-message-envelope.schema.ts
  validation/schemas/telemetry-message.schema.ts
  validation/schemas/heartbeat-message.schema.ts
  validation/schemas/command-message.schema.ts
  validation/schemas/command-ack-message.schema.ts
  mqtt/mqtt-client.provider.ts              # wraps `mqtt` client; connect/reconnect/logging
  mqtt/mqtt-node-listener.service.ts        # subscribes on module init; topic → type resolution; dispatches ForwardNodeEventToKafkaCommand
  mqtt/mqtt-command-publisher.service.ts    # publish(nodeId, envelope)
  kafka/kafka-bridge-producer.service.ts    # send(envelope, key=nodeId) → topic resolved from envelope.type (telemetry/heartbeat/command-acks)
  kafka/kafka-bridge-commands-consumer.service.ts # subscribes on module init; dispatches ForwardCommandToNodeCommand
  persistence/sqlite/entities/bridge-message-log.entity.ts
  persistence/sqlite/repositories/bridge-message-log-typeorm.repository.ts
nodes.module.ts
README.md
```

| File | Action | Description |
|---|---|---|
| `src/core/health/transport/rest/controllers/health.controller.ts` | Modify | Add MQTT + bridge-Kafka indicators to `GET /api/health/ready` |
| `src/contexts/nodes/infrastructure/health/mqtt.health-indicator.ts` | Create | `@nestjs/terminus`-style indicator checking `MqttClientProvider` connection state. Lives in `nodes`, not `src/core/health/` — it needs this context's connection state; `NodesModule` exports it and `HealthModule` imports `NodesModule` to compose it (documented exception, see README) |
| `src/contexts/nodes/infrastructure/health/bridge-kafka.health-indicator.ts` | Create | Checks producer/consumer connection state; same placement rationale as above |
| `src/database/data-sources/sqlite-audit.data-source.ts` | Create | Second `DataSource`, `better-sqlite3`, separate migrations dir |
| `src/database/migrations-sqlite/<ts>-CreateBridgeMessageLog.ts` | Create | `bridge_message_log` table |
| `src/contexts/contexts.module.ts` | Modify | Register `NodesModule` |
| `src/core/config/mqtt.config.ts` | Create | `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID` |
| `src/core/config/kafka.config.ts` | Modify | Add `KAFKA_BRIDGE_TELEMETRY_TOPIC` (default `${KAFKA_TOPIC_PREFIX}.telemetry`), `KAFKA_BRIDGE_HEARTBEAT_TOPIC` (default `${KAFKA_TOPIC_PREFIX}.heartbeat`), `KAFKA_BRIDGE_COMMAND_ACKS_TOPIC` (default `${KAFKA_TOPIC_PREFIX}.command-acks`), `KAFKA_BRIDGE_COMMANDS_TOPIC` (default `${KAFKA_TOPIC_PREFIX}.commands`) |
| `docker-compose.yml` | Modify | Add `mosquitto` service (dev broker) |
| `.env.example` | Modify | Add `MQTT_*`, `KAFKA_BRIDGE_*`, `BRIDGE_AUDIT_DB_PATH`; fix `nestjs-template` → `gardenia-bridge` defaults |
| `package.json` | Modify | `mqtt`, `better-sqlite3` (+ `@types/better-sqlite3` dev), `aedes` (dev), Kafka testcontainers module (dev) |

## Interfaces / Contracts

```ts
// domain/enums/bridge-message-type.enum.ts
export enum BridgeMessageTypeEnum {
  TELEMETRY = 'telemetry',
  HEARTBEAT = 'heartbeat',
  COMMAND = 'command',
  COMMAND_ACK = 'command-ack',
}

// domain/interfaces/bridge-message-envelope.interface.ts
export interface IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum;
  nodeId: string;
  timestamp: string; // ISO 8601
}

// domain/interfaces/telemetry-message.interface.ts
export interface ITelemetryMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.TELEMETRY;
  sensorType: string;
  value: number;
  unit?: string;
}

// domain/interfaces/heartbeat-message.interface.ts
export interface IHeartbeatMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.HEARTBEAT;
  status?: string;
  uptimeSeconds?: number;
}

// domain/interfaces/command-message.interface.ts
export interface ICommandMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.COMMAND;
  commandId: string;
  action: string;
  params?: Record<string, unknown>;
}

// domain/interfaces/command-ack-message.interface.ts
export interface ICommandAckMessage extends IBridgeMessageEnvelope {
  type: BridgeMessageTypeEnum.COMMAND_ACK;
  commandId: string;
  success: boolean;
  message?: string;
}

// domain/interfaces/bridge-message-log-entry.interface.ts
export type BridgeMessageDirection = 'inbound' | 'outbound';
export interface IBridgeMessageLogEntry {
  id: string; // uuid, generated at write time
  direction: BridgeMessageDirection;
  type: BridgeMessageTypeEnum | 'unknown'; // 'unknown' when validation failed before type resolution
  nodeId: string | null; // null when payload didn't parse far enough to extract it
  sourceTopic: string;   // MQTT topic or Kafka topic the message arrived on
  destinationTopic: string | null; // null when forwarding never happened (validation failure)
  rawPayload: string;    // as received, unmodified
  outcome: 'success' | 'error';
  errorReason: string | null;
  processedAt: string; // ISO 8601
}

// domain/repositories/write/bridge-message-log-write.repository.ts
export const BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY = Symbol(
  'BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY',
);
export interface IBridgeMessageLogWriteRepository {
  record(entry: IBridgeMessageLogEntry): Promise<void>;
}
```

**`bridge_message_log` (SQLite) columns**: `id` (text pk, uuid), `direction`
(text, `inbound`|`outbound`), `type` (text), `node_id` (text, nullable),
`source_topic` (text), `destination_topic` (text, nullable), `raw_payload`
(text), `outcome` (text, `success`|`error`), `error_reason` (text, nullable),
`processed_at` (text, ISO timestamp). No indices beyond the primary key in v1
— write-only, no query surface yet.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | Each Zod schema (valid payload accepted; missing/wrong-type field rejected per type); `ForwardNodeEventToKafkaHandler` (calls producer with correct topic/key, records audit success; producer throw → audit error, no throw escapes); `ForwardCommandToNodeHandler` (same, MQTT side); `MqttNodeListenerService` topic→type resolution (all four topic patterns, plus an unrecognized topic is ignored+logged, not crashed on); `BridgeMessageLogTypeormRepository.record` (mocked TypeORM repository) | Jest, `jest.Mocked<T>`, no `@nestjs/testing` |
| Integration | MQTT round-trip against an embedded broker (`aedes`): publish on each of the 4 topic patterns, assert the bridge produces/consumes correctly; Kafka round-trip against a real broker (testcontainers Kafka module, mirroring the existing `@testcontainers/postgresql` pattern): produce a `command` on `gardenia-bridge.commands`, assert an MQTT publish is observed by a test subscriber; `bridge_message_log` write/read against a real temp-file SQLite DB (round-trip: written row matches what was recorded, including malformed-payload rows) | `test/integration/nodes/*.integration-spec.ts`; these integration tests are the closest thing this context has to E2E, since there's no HTTP surface |
| Static | `nodes-no-cross-context-import.spec.ts`: scan `src/contexts/nodes/**` for imports from any other `@contexts/*` context (there are none yet, but the rule holds for future contexts too) | Jest source scan, same pattern as other contexts use |

No REST/GraphQL/MCP E2E suite — there is no HTTP/GraphQL surface to exercise
for this context. `test/e2e/` gains nothing from this change.

## Migration / Rollout

Two independent, additive migration stores:
- Postgres: none — this change touches no Postgres table.
- SQLite (new): single migration creating `bridge_message_log`. `down()`
  drops it. Runs against `BRIDGE_AUDIT_DB_PATH` (default e.g.
  `./data/bridge-audit.sqlite`), created on first boot if the file doesn't
  exist (`synchronize`/migration-run behavior mirrors the existing
  `DATABASE_MIGRATIONS_RUN` convention, scoped to the SQLite connection).

No backfill. No coordination needed with `gardenia-api` or `gardenia-web` —
this change is entirely internal to `gardenia-bridge` and produces/consumes
topics that nothing else currently reads or writes.

## Open Questions

- **Node authentication**: deferred by explicit decision. When it's time,
  the natural extension points are (a) broker-level username/password per
  node (`MQTT_USERNAME`/`MQTT_PASSWORD` env vars already exist for the
  *bridge's own* connection — per-node credentials would need the broker to
  support them, e.g. Mosquitto's password file / dynamic-security plugin) or
  (b) mutual TLS with per-device certs. Neither requires a bridge code change
  to the message-handling path — only to how the MQTT client connects, and
  possibly an ACL layer on the broker itself. *(Out of scope for this
  change.)*
- **SQLite retention/rotation**: no policy in v1. If the bridge runs
  long-lived at the edge, the audit DB will grow unbounded. A follow-up could
  add a scheduled prune (e.g. keep last N days) — deferred until it's an
  actual problem, since the audit log's exact shelf life depends on
  deployment specifics not yet decided. *(Out of scope for this change.)*
- **`gardenia-api` consumer/producer**: this change proves the bridge in
  isolation. Wiring real Kafka consumers (for `gardenia-bridge.telemetry` /
  `.heartbeat` / `.command-acks`) and a producer (for
  `gardenia-bridge.commands`) into `gardenia-api` is explicitly a separate,
  future change in that repo. *(Out of scope for this change.)*
