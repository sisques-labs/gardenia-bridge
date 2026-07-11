# Tasks: Kafka ↔ MQTT Bridge (`kafka-mqtt-bridge`)

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900 – 1 200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → Domain + Application (envelope, schemas, commands) · PR 2 → Infrastructure (MQTT, Kafka, SQLite persistence) · PR 3 → Wiring (module, health, config, docker-compose) + Tests |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |
| 400-line budget risk | High |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|---|---|---|---|
| 1 | Domain + Application | PR 1 | Envelope interfaces, enum, exception, repository port, both commands + handlers |
| 2 | Infrastructure | PR 2 | Zod schemas, MQTT client/listener/publisher, Kafka producer/consumer, SQLite entity/repository/migration |
| 3 | Wiring + health + docker-compose | PR 3 | `nodes.module.ts`, `contexts.module.ts`, config files, health indicators, `.env.example`, `docker-compose.yml`, README |
| 4 | Tests | PR 3 or 4 (bundle with wiring if budget allows) | Unit + integration + static |

---

## Phase 1: Domain

- [x] 1.1 Create `src/contexts/nodes/domain/enums/bridge-message-type.enum.ts` — `BridgeMessageTypeEnum` (`TELEMETRY='telemetry'`, `HEARTBEAT='heartbeat'`, `COMMAND='command'`, `COMMAND_ACK='command-ack'`)
- [x] 1.2 Create `src/contexts/nodes/domain/interfaces/bridge-message-envelope.interface.ts` — `IBridgeMessageEnvelope` (`type`, `nodeId`, `timestamp`)
- [x] 1.3 Create `src/contexts/nodes/domain/interfaces/telemetry-message.interface.ts` — `ITelemetryMessage extends IBridgeMessageEnvelope` (`sensorType`, `value`, `unit?`)
- [x] 1.4 Create `src/contexts/nodes/domain/interfaces/heartbeat-message.interface.ts` — `IHeartbeatMessage extends IBridgeMessageEnvelope` (`status?`, `uptimeSeconds?`)
- [x] 1.5 Create `src/contexts/nodes/domain/interfaces/command-message.interface.ts` — `ICommandMessage extends IBridgeMessageEnvelope` (`commandId`, `action`, `params?`)
- [x] 1.6 Create `src/contexts/nodes/domain/interfaces/command-ack-message.interface.ts` — `ICommandAckMessage extends IBridgeMessageEnvelope` (`commandId`, `success`, `message?`)
- [x] 1.7 Create `src/contexts/nodes/domain/interfaces/bridge-message-log-entry.interface.ts` — `IBridgeMessageLogEntry` + `BridgeMessageDirection` type alias
- [x] 1.8 Create `src/contexts/nodes/domain/exceptions/invalid-message-payload.exception.ts` — extends `BaseException`; carries the validation error detail
- [x] 1.9 Create `src/contexts/nodes/domain/repositories/write/bridge-message-log-write.repository.ts` — `IBridgeMessageLogWriteRepository` (`record`) + `BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY` Symbol

---

## Phase 2: Application

- [x] 2.1 Create `src/contexts/nodes/application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.command.ts` — `ForwardNodeEventToKafkaCommandInput` (`sourceTopic`, `rawPayload`, `envelope: ITelemetryMessage | IHeartbeatMessage | ICommandAckMessage`)
- [x] 2.2 Create `src/contexts/nodes/application/commands/forward-node-event-to-kafka/forward-node-event-to-kafka.handler.ts` — calls `KafkaBridgeProducerService.send(envelope, key=nodeId)` (producer resolves the topic from `envelope.type`); on success records `BridgeMessageLog` (inbound, success, destinationTopic=the resolved topic); on producer throw, records error outcome and rethrows nothing further (swallow after logging, so the MQTT listener doesn't crash); logs on completion
- [x] 2.3 Create `src/contexts/nodes/application/commands/forward-command-to-node/forward-command-to-node.command.ts` — `ForwardCommandToNodeCommandInput` (`sourceTopic`, `rawPayload`, `envelope: ICommandMessage`)
- [x] 2.4 Create `src/contexts/nodes/application/commands/forward-command-to-node/forward-command-to-node.handler.ts` — calls `MqttCommandPublisherService.publish(nodeId, envelope)`; records `BridgeMessageLog` (outbound, success/error); logs on completion

---

## Phase 3: Infrastructure — Validation

- [x] 3.1 Create `src/contexts/nodes/infrastructure/validation/schemas/bridge-message-envelope.schema.ts` — base Zod object (`type` enum, `nodeId` non-empty string, `timestamp` ISO datetime string)
- [x] 3.2 Create `src/contexts/nodes/infrastructure/validation/schemas/telemetry-message.schema.ts` — extends envelope; `sensorType` non-empty string, `value` number, `unit` optional string
- [x] 3.3 Create `src/contexts/nodes/infrastructure/validation/schemas/heartbeat-message.schema.ts` — extends envelope; `status` optional string, `uptimeSeconds` optional non-negative number
- [x] 3.4 Create `src/contexts/nodes/infrastructure/validation/schemas/command-message.schema.ts` — extends envelope; `commandId` non-empty string, `action` non-empty string, `params` optional `z.record(z.string(), z.unknown())`
- [x] 3.5 Create `src/contexts/nodes/infrastructure/validation/schemas/command-ack-message.schema.ts` — extends envelope; `commandId` non-empty string, `success` boolean, `message` optional string
- [x] 3.6 Create `src/contexts/nodes/infrastructure/validation/parse-node-event-payload.ts` — helper: given a topic + raw payload, resolve expected type from topic pattern, `JSON.parse` (catch → `InvalidMessagePayloadException`), validate with the matching schema (catch Zod error → `InvalidMessagePayloadException`), return typed envelope
- [x] 3.7 Create `src/contexts/nodes/infrastructure/validation/parse-command-payload.ts` — same, for the single Kafka→MQTT direction (always `command` type)

---

## Phase 4: Infrastructure — MQTT

- [x] 4.1 Create `src/core/config/mqtt.config.ts` — `MqttConfig`: `url` (`MQTT_URL`, default `mqtt://localhost:1883`), `username`/`password` (`MQTT_USERNAME`/`MQTT_PASSWORD`, optional), `clientId` (`MQTT_CLIENT_ID`, default `gardenia-bridge`)
- [x] 4.2 Create `src/contexts/nodes/infrastructure/mqtt/mqtt-client.provider.ts` — `@Injectable()`, wraps `mqtt.connect(...)`; exposes the underlying client; connects `onModuleInit`, disconnects `onModuleDestroy`; logs `connect`/`reconnect`/`close`/`error` events
- [x] 4.3 Create `src/contexts/nodes/infrastructure/mqtt/mqtt-node-listener.service.ts` — `@Injectable()`, `OnModuleInit`; subscribes to `sensors/+/+/telemetry`, `nodes/+/heartbeat`, `nodes/+/commands/ack`; on message: extract `nodeId` from topic, call `parseNodeEventPayload`, dispatch `ForwardNodeEventToKafkaCommand` via `CommandBus`; on parse failure, record a `BridgeMessageLog` error entry directly (no command dispatch, since there's nothing valid to forward) and log a warning; logs at entry (topic + nodeId) per the logging convention
- [x] 4.4 Create `src/contexts/nodes/infrastructure/mqtt/mqtt-command-publisher.service.ts` — `@Injectable()`; `publish(nodeId, envelope)` → `client.publish('nodes/{nodeId}/commands', JSON.stringify(envelope), { qos: 1 })`; logs start/completion of the publish (I/O boundary logging convention)

---

## Phase 5: Infrastructure — Kafka

- [x] 5.1 Modify `src/core/config/kafka.config.ts` — add `bridgeTelemetryTopic` (`KAFKA_BRIDGE_TELEMETRY_TOPIC`, default `` `${topicPrefix}.telemetry` ``), `bridgeHeartbeatTopic` (`KAFKA_BRIDGE_HEARTBEAT_TOPIC`, default `` `${topicPrefix}.heartbeat` ``), `bridgeCommandAcksTopic` (`KAFKA_BRIDGE_COMMAND_ACKS_TOPIC`, default `` `${topicPrefix}.command-acks` ``), and `bridgeCommandsTopic` (`KAFKA_BRIDGE_COMMANDS_TOPIC`, default `` `${topicPrefix}.commands` ``) to `IKafkaConfig`/the local config shape
- [x] 5.2 Create `src/contexts/nodes/infrastructure/kafka/kafka-bridge-producer.service.ts` — `@Injectable()`, `OnModuleInit`/`OnModuleDestroy`; own `kafkajs` `Producer` (client built from the existing `KafkaConfig` broker/ssl/sasl settings); `send(envelope)` → resolves the destination topic from `envelope.type` (`telemetry`→`bridgeTelemetryTopic`, `heartbeat`→`bridgeHeartbeatTopic`, `command-ack`→`bridgeCommandAcksTopic`), produces with key=`envelope.nodeId`; connects/disconnects with the module lifecycle; no-ops (logs + skips) when `KAFKA_ENABLED=false`, mirroring the existing opt-in pattern
- [x] 5.3 Create `src/contexts/nodes/infrastructure/kafka/kafka-bridge-commands-consumer.service.ts` — `@Injectable()`, `OnModuleInit`/`OnModuleDestroy`; own `kafkajs` `Consumer` (dedicated group id, e.g. `${clientId}-bridge-commands`), subscribes to `bridgeCommandsTopic`; on each message: `parseCommandPayload`, dispatch `ForwardCommandToNodeCommand` via `CommandBus`; on parse failure, record a `BridgeMessageLog` error entry directly and log a warning; no-ops when `KAFKA_ENABLED=false`

---

## Phase 6: Infrastructure — SQLite Audit Persistence

- [x] 6.1 Create `src/core/config/sqlite-audit.config.ts` — `SqliteAuditConfig`: `dbPath` (`BRIDGE_AUDIT_DB_PATH`, default `./data/bridge-audit.sqlite`)
- [x] 6.2 Create `src/database/data-sources/sqlite-audit.data-source.ts` — second `DataSource` (`type: 'better-sqlite3'`, `database: BRIDGE_AUDIT_DB_PATH`, its own `migrations-sqlite/` glob, `migrationsTableName: 'migrations_sqlite'`), CLI-invocable like the existing `data-source.ts`
- [x] 6.3 Create `src/database/migrations-sqlite/<timestamp>-CreateBridgeMessageLog.ts` — `up()` creates `bridge_message_log` (`id` text pk, `direction` text, `type` text, `node_id` text nullable, `source_topic` text, `destination_topic` text nullable, `raw_payload` text, `outcome` text, `error_reason` text nullable, `processed_at` text); `down()` drops it
- [x] 6.4 Create `src/contexts/nodes/infrastructure/persistence/sqlite/entities/bridge-message-log.entity.ts` — `@Entity('bridge_message_log')` matching the migration's columns
- [x] 6.5 Create `src/contexts/nodes/infrastructure/persistence/sqlite/repositories/bridge-message-log-typeorm.repository.ts` — implements `IBridgeMessageLogWriteRepository`; injects the SQLite-connection repository (`@InjectRepository(BridgeMessageLogEntity, 'sqlite-audit')`); `record()` generates `id` (uuid) if absent, inserts the row; catches and logs (does not rethrow) persistence errors, per the "audit logging must not block the relay" rule
- [x] 6.6 Modify `package.json` — add `better-sqlite3` (runtime) + `@types/better-sqlite3` (dev)

---

## Phase 7: Module Wiring, Health, Config, Docker

- [x] 7.1 Create `src/contexts/nodes/nodes.module.ts` — imports `CqrsModule`, `TypeOrmModule.forFeature([BridgeMessageLogEntity], 'sqlite-audit')`; providers grouped as `COMMAND_HANDLERS`, `INFRASTRUCTURE_REPOSITORIES` (bind `BRIDGE_MESSAGE_LOG_WRITE_REPOSITORY` via `useClass`), plus the MQTT/Kafka services (`MqttClientProvider`, `MqttNodeListenerService`, `MqttCommandPublisherService`, `KafkaBridgeProducerService`, `KafkaBridgeCommandsConsumerService`)
- [x] 7.2 Modify `src/contexts/contexts.module.ts` — add `NodesModule` to `CONTEXT_MODULES`
- [x] 7.3 Modify `src/core/core.module.ts` — register the second TypeORM connection (`TypeOrmModule.forRoot({ name: 'sqlite-audit', ...sqliteAuditConfig() })`) alongside the existing Postgres one; load `mqtt.config.ts` / `sqlite-audit.config.ts` in `ConfigModule.forRoot({ load: [...] })`. Uses `forRoot` (sync), not `forRootAsync` — @nestjs/typeorm 11 has a shutdown-hook bug (`UnknownElementException: Nest could not find DataSource element`) when two `forRootAsync()` TypeORM connections coexist in one app; reproduced in isolation and confirmed `forRoot` for the second connection avoids it (no async I/O needed anyway — `sqliteAuditConfig()` just reads `process.env`).
- [x] 7.4 Create `src/contexts/nodes/infrastructure/health/mqtt.health-indicator.ts` — `@Injectable()` extending Terminus `HealthIndicator`; reports up/down from `MqttClientProvider`'s connection state. Placed inside `nodes` (not `src/core/health/`) and exported by `NodesModule`; `HealthModule` imports `NodesModule` to compose it — documented exception in `src/contexts/nodes/README.md`
- [x] 7.5 Create `src/contexts/nodes/infrastructure/health/bridge-kafka.health-indicator.ts` — reports up/down from the producer/consumer connection state; `KAFKA_ENABLED=false` reports "up" (disabled-is-healthy) so a deliberately-off Kafka doesn't fail readiness
- [x] 7.6 Modify `src/core/health/transport/rest/controllers/health.controller.ts` — add both indicators to the `readiness` check group
- [x] 7.7 Modify `.env.example` — add `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD`, `MQTT_CLIENT_ID`, `KAFKA_BRIDGE_TELEMETRY_TOPIC`, `KAFKA_BRIDGE_HEARTBEAT_TOPIC`, `KAFKA_BRIDGE_COMMAND_ACKS_TOPIC`, `KAFKA_BRIDGE_COMMANDS_TOPIC`, `BRIDGE_AUDIT_DB_PATH`; fix `KAFKA_CLIENT_ID`/`KAFKA_TOPIC_PREFIX` stale `nestjs-template` defaults to `gardenia-bridge`
- [x] 7.8 Modify `docker-compose.yml` — add an `eclipse-mosquitto` service (dev broker) with a minimal anonymous-access config file under a new `docker/mosquitto/mosquitto.conf`
- [x] 7.9 Modify `package.json` — add `mqtt` (runtime dependency)
- [x] 7.10 Create `src/contexts/nodes/README.md` — context walkthrough: message types, topic tables (MQTT ↔ Kafka), commands, the "what applies / what doesn't" deviation summary from `design.md`, audit log shape, following the existing README template used by other contexts (see e.g. `gardenia-api`'s context READMEs for the expected shape)

---

## Phase 8: Tests

- [x] 8.1 Unit — `bridge-message-envelope.schema.spec.ts` + one spec per type schema: valid payload accepted; each required field missing/wrong-typed rejected; unknown `type` rejected
- [x] 8.2 Unit — `parse-node-event-payload.spec.ts`: correct type resolved per topic pattern; invalid JSON → `InvalidMessagePayloadException`; schema failure → `InvalidMessagePayloadException`
- [x] 8.3 Unit — `parse-command-payload.spec.ts`: same, for the command direction
- [x] 8.4 Unit — `forward-node-event-to-kafka.handler.spec.ts`: producer called with correct topic/key/payload; audit log recorded success; producer throw → audit log recorded error, handler does not rethrow
- [x] 8.5 Unit — `forward-command-to-node.handler.spec.ts`: MQTT publisher called with correct topic/payload; audit log recorded success; publisher throw → audit log recorded error, handler does not rethrow
- [x] 8.6 Unit — `mqtt-node-listener.service.spec.ts`: each of the 4 topic patterns resolves the right type + nodeId extraction; unrecognized topic is ignored without throwing; parse failure records an audit entry without dispatching a command
- [x] 8.7 Unit — `bridge-message-log-typeorm.repository.spec.ts`: `record()` inserts via the mocked TypeORM repository; generates `id` when absent; persistence error is caught and logged, not rethrown
- [x] 8.8 Integration — `mqtt-bridge.integration-spec.ts`: real MQTT round-trip via an embedded aedes broker (real wire protocol, real Zod validation, real CqrsModule dispatch) with a recording fake for the Kafka producer side (no reachable Docker daemon in the authoring sandbox — see 8.8b). Executed and passing. `kafka-bridge.integration-spec.ts` (8.8b, new): real Kafka round-trip via testcontainers, self-skips gracefully when no Docker daemon is reachable (authored + verified to skip cleanly here; not exercised against a real broker in this sandbox — run where Docker is available).
- [x] 8.9 Integration — `bridge-message-log.integration-spec.ts`: write rows (success and error outcomes) against a real temp-file SQLite DB; read them back and assert field-for-field equality. Executed and passing.
- [x] 8.10 Static — `nodes-no-cross-context-import.spec.ts`: scan `src/contexts/nodes/**` for imports from any other `@contexts/<other>/` bounded context
- [x] 8.11 Modify `package.json` — add `aedes` (dev) and a Kafka testcontainers module (dev), matching the existing `@testcontainers/postgresql` pattern

---

## Phase 9: Post-review rework — Value Objects + full aggregate for the audit log

Triggered by code review on PR #16 (JSisques), which rejected Phase 1–8's
"no VOs / no aggregate" decision. See `design.md`'s "Note — reversal..." for
the rationale. Scope: apply consistently across the whole `nodes` context,
not just the commented lines.

- [x] 9.1 Create 17 Value Objects under `domain/value-objects/{name}/` — `NodeIdValueObject`, `CommandIdValueObject` (both `UuidValueObject`); `BridgeMessageTypeValueObject`, `BridgeMessageDirectionValueObject`, `BridgeMessageOutcomeValueObject` (`EnumValueObject`); `TopicValueObject`, `RawPayloadValueObject`, `ErrorReasonValueObject`, `SensorTypeValueObject`, `SensorUnitValueObject`, `NodeStatusValueObject`, `CommandActionValueObject`, `AckMessageValueObject` (`StringValueObject`); `SensorValueValueObject`, `UptimeSecondsValueObject` (`NumberValueObject`); `CommandSuccessValueObject` (`BooleanValueObject`); `CommandParamsValueObject` (`JsonValueObject`)
- [x] 9.2 Add `domain/enums/bridge-message-direction.enum.ts`, `domain/enums/bridge-message-outcome.enum.ts`; add `UNKNOWN` to `BridgeMessageTypeEnum`
- [x] 9.3 Add `domain/primitives/*.primitives.ts` (parallel primitives-only shapes for every message type + the audit log) and rewrite `domain/interfaces/*.interface.ts` to be VO-typed; delete the old `bridge-message-direction.type.ts` and `bridge-message-log-entry.interface.ts`
- [x] 9.4 Create `domain/factories/node-event-message.factory.ts` and `domain/factories/command-message.factory.ts` — primitives→VO builders + the VO→primitives reverse conversion (needed before every `JSON.stringify` on the wire, since most kit VO base classes have no `toJSON()`)
- [x] 9.5 Create the `BridgeMessageLogAggregate` (`domain/aggregates/`), `BridgeMessageLogBuilder` (`domain/builders/`, not DI-registered — see design.md), `BridgeMessageLogViewModel` (`domain/view-models/`, unused by any transport but required by `IBuilder`), `BridgeMessageRecordedEvent` + its event-data interface (`domain/events/`)
- [x] 9.6 Change `IBridgeMessageLogWriteRepository` from `record(entry)` to `save(aggregate)`; rewrite `BridgeMessageLogTypeormRepository` to call `aggregate.toPrimitives()`; add `created_at`/`updated_at` columns to the entity + migration (required by `BasePrimitives`)
- [x] 9.7 Rewrite both Commands to take a primitives `Input` and wrap into VOs in the constructor (pick/omit convention); rewrite both Handlers to extend `BaseCommandHandler`, build the aggregate via the Builder, `save()` + `publishEvents()` for both the success and error outcome
- [x] 9.8 Update `MqttNodeListenerService`/`KafkaBridgeCommandsConsumerService` to inject `EventBus`, build the audit aggregate inline on a parse failure, and guard that build in its own nested try/catch (a malformed topic can yield a non-UUID `nodeId`, which must not crash the listener)
- [x] 9.9 Fix `MqttCommandPublisherService`/`KafkaBridgeProducerService` to serialize `nodeEventMessageToPrimitives(envelope)`/`commandMessageToPrimitives(envelope)` before `JSON.stringify`, not the VO envelope directly
- [x] 9.10 Rewrite every affected unit test (7 files) and every integration test (3 files) for the new primitives/VO/Aggregate/EventBus shapes; add new unit specs for all 17 VOs, the aggregate, the builder, and both factories
- [x] 9.11 Run `pnpm gen:topics` — `BridgeMessageLogAggregate` is now a real aggregate, so `aggregate-module.map.generated.ts` needed regenerating (CI's `pnpm gen:topics:check` gate would otherwise fail)
- [x] 9.12 Re-verify: `tsc --noEmit`, `nest build`, `eslint --fix`, full unit suite (213 tests / 47 suites), full `nodes` integration suite (9 tests / 3 suites) — all green
- [x] 9.13 Update `design.md`/`proposal.md`/`state.yaml` to document the reversal
