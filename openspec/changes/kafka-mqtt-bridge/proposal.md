# Proposal: Kafka ↔ MQTT Bridge (`nodes`)

## Intent

Gardenia is about to have physical nodes in the field (irrigation controllers,
soil/temperature/humidity sensors) that speak MQTT — the standard low-power,
pub/sub protocol for constrained IoT devices. The rest of the platform speaks
Kafka. Nothing today translates between the two.

This change introduces the **first bounded context of `gardenia-bridge`**:
`nodes`, a stateless message-translation pipe between an MQTT broker (Mosquitto
in dev, configurable elsewhere) and Kafka. It is intentionally **not** a device
registry — there is no `NodeAggregate`, no CRUD, no catalog of known
nodes/sensors. The bridge does not need to know a node "exists" to relay its
messages; it validates shape, translates, and forwards.

Two flows, both best-effort (MQTT QoS 0/1, no DLQ, no retries in v1):

- **Node → Kafka**: sensors publish `telemetry` and `heartbeat`; nodes publish
  `command-ack` after executing a command. Each type lands on its own Kafka
  topic (`gardenia-bridge.telemetry`, `gardenia-bridge.heartbeat`,
  `gardenia-bridge.command-acks`), keyed by `nodeId`.
- **Kafka → Node**: any producer (today: nobody yet — `gardenia-api` is not
  wired in this change) publishes a `command` to `gardenia-bridge.commands`;
  the bridge relays it to the target node's MQTT command topic.

Because the bridge is meant to run **at the edge**, close to the nodes and
possibly without reliable network access to the platform's central Postgres,
every message the bridge processes (in either direction) is also appended to a
**local SQLite audit log** — a flat, queryable record of what was relayed and
whether it succeeded. It's append-only (no updates, no relations) but it *is*
modeled as a full domain aggregate (`BridgeMessageLogAggregate`), per this
org's convention that every persisted write goes through
`BaseAggregate`/`Builder`/domain events, not a plain entity — see `design.md`
for the (reversed, post-review) rationale.

This is the **precedent-setting first context** for this service (per
`AGENTS.md`/`architecture` skill: "the first context added defines the pattern
every subsequent one follows"). It deliberately does **not** use every piece
of DDD+CQRS+Hexagonal ceremony this template ships for typical CRUD contexts
(GraphQL `findByCriteria`, REST/MCP transport, query handlers — there's no
query surface at all), but Value Objects and the audit-log's `BaseAggregate`
do apply, same as any other context — see `design.md`
for exactly what applies and what doesn't, and why.

## Scope

### In Scope

- New `nodes` bounded context under `src/contexts/nodes/` (domain →
  application → infrastructure only — no `transport/` subtree; see below).
- MQTT client wiring (`mqtt` npm package) configurable entirely via env vars
  (broker host/port/protocol, credentials, TLS on/off, client id) — no
  hardcoded broker, mirroring how `KAFKA_*` / `DATABASE_*` are already
  configured in this template.
- A dedicated Kafka producer/consumer for the bridge's own relay topics
  (`gardenia-bridge.telemetry` / `.heartbeat` / `.command-acks` /
  `.commands`), built directly on
  `kafkajs` (already a dependency) — **not** `@sisques-labs/nestjs-kit`'s
  `MessagingModule`. `MessagingModule` is purpose-built for forwarding a CQRS
  aggregate's own domain events to `{prefix}.{module}` topics (and, since the
  audit log became a real aggregate, it *does* now pick up
  `BridgeMessageRecordedEvent` and forward it to `gardenia-bridge.nodes`
  automatically) — but it doesn't give producer/consumer control over
  arbitrary topic names, keys, or offsets, which the raw node-message relay
  needs.
- Four message types with a shared envelope
  (`type`, `nodeId`, `timestamp`, ...payload), validated at the boundary:
  `telemetry`, `heartbeat`, `command-ack` (node → Kafka), `command`
  (Kafka → node).
- MQTT topic scheme: `sensors/{nodeId}/{sensorType}/telemetry`,
  `nodes/{nodeId}/heartbeat`, `nodes/{nodeId}/commands/ack`,
  `nodes/{nodeId}/commands`.
- Kafka topic scheme, **one topic per message type from the start**:
  `gardenia-bridge.telemetry`, `gardenia-bridge.heartbeat`,
  `gardenia-bridge.command-acks` (all node → Kafka), `gardenia-bridge.commands`
  (Kafka → node). All four keyed by `nodeId` for per-node ordering (no global
  ordering guarantee).
- SQLite audit log (`better-sqlite3` via a second TypeORM connection,
  independent of the main Postgres connection): one row per message processed
  — direction, type, nodeId, source topic, destination topic, raw payload,
  timestamp, outcome (success/error + reason).
- Config: MQTT connection (`MQTT_*`), bridge Kafka topics
  (`KAFKA_BRIDGE_TELEMETRY_TOPIC`, `KAFKA_BRIDGE_HEARTBEAT_TOPIC`,
  `KAFKA_BRIDGE_COMMAND_ACKS_TOPIC`, `KAFKA_BRIDGE_COMMANDS_TOPIC`, reusing
  the existing `KAFKA_ENABLED`/`KAFKA_BROKERS`/`KAFKA_SSL`/`KAFKA_SASL_*`
  connection vars — one Kafka cluster, one set of connection vars), and
  SQLite (`BRIDGE_AUDIT_DB_PATH`).
- Register `NodesModule` in `CONTEXT_MODULES` (`src/contexts/contexts.module.ts`).
- Extend the existing health module (`src/core/health/`) with MQTT and bridge
  Kafka connectivity indicators, surfaced on the existing
  `GET /api/health/ready` — no new context-owned transport.
- `docker-compose.yml`: add a Mosquitto service for local dev, matching the
  existing Postgres dev service pattern.

### Out of Scope

- **Node/device registry** — no persisted catalog of known nodes/sensors, no
  online/offline tracking, no device metadata. A node is just an id string
  that appears in a topic/payload.
- **Authentication of nodes against the MQTT broker** — no username/password,
  no mutual TLS in v1. Explicitly deferred; the design must not preclude
  adding it later (see `design.md` Open Questions).
- **At-least-once delivery, retries, dead-letter handling, deduplication** —
  best-effort only in this version.
- **`gardenia-api` integration** — no consumer is wired up on the
  `gardenia-api` side to read the bridge's node→Kafka topics or produce to
  `gardenia-bridge.commands`. This change only builds and proves the bridge in
  isolation (e.g. via `mosquitto_pub`/a local Kafka consumer in tests). Wiring
  a real producer/consumer into `gardenia-api` is a follow-up change in that
  repo.
- **Any business GraphQL/REST/MCP transport in `nodes`** — this context has no
  `transport/` subtree of its own.
- **Querying the SQLite audit log** — v1 only writes to it. No read API,
  REST/GraphQL/MCP surface, or retention/rotation policy. It's a debugging
  aid, inspectable directly as a SQLite file.
- **Command routing/validation of `action`/`params` semantics** — the bridge
  relays `command` payloads opaquely; it doesn't know what "open valve" means,
  only that the envelope is well-formed.

## Capabilities

### New Capabilities

- `nodes`: bidirectional, best-effort message relay between an MQTT broker and
  Kafka for IoT node traffic (telemetry, heartbeat, command, command-ack),
  with a local SQLite audit trail of every message processed. No device
  registry, no business transport.

### Modified Capabilities

- `health`: `GET /api/health/ready` gains MQTT and bridge-Kafka connectivity
  checks alongside the existing Postgres check.

## Approach

- **No aggregate for the relayed messages themselves.** Node → Kafka / Kafka →
  node messages are transient — they exist for one function call, are never
  persisted, and are re-validated on every hop, so they aren't modeled as an
  `Aggregate`. Every field is still wrapped in a Value Object though (see
  next point) — VOs and aggregates are separate concerns, and this org wraps
  primitives in VOs regardless of whether an aggregate sits behind them.
  Messages are represented as VO-typed `domain/interfaces/*.interface.ts`
  types, built from a parallel primitives-only shape
  (`domain/primitives/*.primitives.ts`) via `domain/factories/*.factory.ts`.
  Zod still validates the raw payload into primitives at the infrastructure
  boundary before anything reaches application logic; the VO wrapping happens
  one layer in, at the CQRS Command's constructor.
- **CQRS commands, primitives in / VOs out.** Two commands —
  `ForwardNodeEventToKafka` (triggered by the MQTT listener) and
  `ForwardCommandToNode` (triggered by the Kafka consumer) — take a
  primitives-typed `Input` and wrap every field into its Value Object inside
  the constructor, matching this org's `DeleteQrCommand`/`CreateQrCommand`
  pick/omit convention. Handlers extend `BaseCommandHandler`, call the
  Kafka/MQTT infrastructure clients, and build+save+publish the
  `BridgeMessageLogAggregate` for every outcome (success or failure).
- **`BridgeMessageLog` is a full aggregate, not a dumb record.** Append-only
  (there's no `update()`/`delete()`, only `record()`), but every field is
  VO-typed and `record()` emits a `BridgeMessageRecordedEvent` through the
  standard `BaseAggregate`/`Builder`/`EventBus.publishAll` pipeline, written
  via the same hexagonal port as before
  (`domain/repositories/write/bridge-message-log-write.repository.ts`, now
  `save(aggregate)` instead of `record(entry)`). This reverses the original
  draft of this proposal (see `design.md`'s "Note — reversal..." for why).
- **One Kafka topic per message type, from the start.** `telemetry`,
  `heartbeat`, and `command-ack` each get their own topic rather than sharing
  one discriminated-by-`type` topic. A consumer that only cares about
  heartbeats (e.g. a liveness dashboard) subscribes to
  `gardenia-bridge.heartbeat` alone, without pulling telemetry volume and
  filtering it out. Each topic also has one exact message shape, so a
  consumer's deserializer doesn't need to branch on a discriminant field.
- **Bridge owns its own Kafka topic namespace** (`gardenia-bridge.*`), not
  `gardenia-api.*` — the bridge is the integration boundary for IoT traffic;
  any service (starting with, but not limited to, `gardenia-api`) that wants
  telemetry or wants to send commands subscribes to / produces on these
  topics from outside this repo.
- **SQLite via a second TypeORM connection** (`better-sqlite3` driver),
  keeping one ORM/tooling story (entities, migrations via
  `pnpm migration:generate`) instead of introducing raw SQL for a one-off
  table — see `design.md` for the alternative considered and rejected.

## Affected Areas

| Area | Impact | Description |
|------|--------|--------------|
| `src/contexts/nodes/` | New | Full bounded context: domain, application, infrastructure (no transport) |
| `src/core/health/` | Modified | Add MQTT + bridge-Kafka readiness indicators |
| `src/core/config/mqtt.config.ts` | New | MQTT connection config, env-driven |
| `src/core/config/kafka.config.ts` | Modified | Add bridge topic name vars (events/commands), reusing existing broker connection vars |
| `src/database/data-source.ts` | Modified | Document/support a second SQLite `DataSource` for the audit log (separate from the Postgres one) |
| `src/database/migrations-sqlite/` | New | SQLite migration(s) for `bridge_message_log` |
| `src/contexts/contexts.module.ts` | Modified | Register `NodesModule` |
| `docker-compose.yml` | Modified | Add local Mosquitto service |
| `.env.example` | Modified | Add `MQTT_*`, `KAFKA_BRIDGE_*`, `BRIDGE_AUDIT_DB_PATH`; fix stale `nestjs-template` defaults → `gardenia-bridge` |
| `package.json` | Modified | Add `mqtt`; add `better-sqlite3` (+ types); add `aedes` and a Kafka testcontainers module as dev dependencies for integration tests |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|-------------|
| Best-effort delivery silently drops a message under broker/broker-connection flakiness | Med | Explicit v1 decision, documented; every drop is still recorded in the SQLite audit log with an error outcome, so it's visible even though it isn't retried |
| No MQTT auth means anyone who can reach the broker can spoof node traffic | Med (accepted for dev/PoC) | Explicitly out of scope by decision; design doesn't preclude adding broker-level auth or mutual TLS later (client config already reads credentials from env, just unset) |
| Two independent I/O systems (MQTT + Kafka) both need to be up for the bridge to do anything useful | Med | Each has its own health indicator; the service still boots and stays up if one side is down (mirrors `KAFKA_ENABLED` opt-in pattern), logging connection state changes |
| Second TypeORM `DataSource` (SQLite) alongside the existing Postgres one is a new pattern for this template | Low | Isolated to `nodes`; documented explicitly in `design.md`; no other context is forced to adopt it |
| Four bridge-owned Kafka topics from day one, with no real consumer yet, is more topic surface than is proven necessary | Low | Accepted trade-off for consumer-side simplicity (see Approach); topics are cheap to create and each has a narrow, stable schema |
| SQLite file growth on a long-running edge deployment with no retention policy | Low | Explicitly flagged as an Open Question / out of scope; not blocking v1 |

## Rollback Plan

Additive-only change: new bounded context, new config, new docker-compose
service, health check additions. Revert the branch; drop the SQLite audit DB
file (or leave it — it's local, disposable, and owned by no other system).
No Postgres migration, no impact on any other context or service.

## Dependencies

- New runtime dependency: `mqtt` (MQTT 3.1.1/5 client).
- New runtime dependency: `better-sqlite3` (+ `@types/better-sqlite3` dev).
- New dev dependencies for integration tests: `aedes` (embedded MQTT broker),
  a Kafka testcontainers module (mirrors the existing
  `@testcontainers/postgresql` pattern).
- Reuses `kafkajs` (already a dependency), `zod` (already a dependency),
  `@nestjs/config`, `CqrsModule`, the existing `Logger` conventions.
- Local dev requires a Mosquitto broker (added to `docker-compose.yml`).

## Success Criteria

- [ ] Publishing a well-formed `telemetry` message results in a matching
      message on `gardenia-bridge.telemetry`, keyed by `nodeId`.
- [ ] Publishing a well-formed `heartbeat` message results in a matching
      message on `gardenia-bridge.heartbeat`, keyed by `nodeId`.
- [ ] Publishing a well-formed `command-ack` on
      `nodes/{nodeId}/commands/ack` results in a matching message on
      `gardenia-bridge.command-acks`, keyed by `nodeId`.
- [ ] Producing a well-formed `command` on `gardenia-bridge.commands` results
      in a matching MQTT publish on `nodes/{nodeId}/commands`.
- [ ] A malformed payload (either direction) is rejected at the boundary,
      never reaches Kafka/MQTT, and is recorded in the SQLite audit log with
      an error outcome.
- [ ] Every processed message (success or failure, either direction) has a
      corresponding row in the SQLite audit log.
- [ ] `GET /api/health/ready` reflects MQTT and bridge-Kafka connectivity.
- [ ] The service boots cleanly with `KAFKA_ENABLED=false` and/or the MQTT
      broker unreachable, logging the degraded state rather than crashing.
- [ ] Unit and integration tests green; no GraphQL/REST/MCP surface exists
      for `nodes`.
