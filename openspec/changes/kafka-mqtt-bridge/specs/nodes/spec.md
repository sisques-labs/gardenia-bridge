# Nodes — Kafka ↔ MQTT bridge for IoT node traffic

**Source change:** kafka-mqtt-bridge
**Created:** 2026-07-10

---

## Requirements

### Requirement: Message Envelope

Every message the bridge processes, in either direction, MUST conform to a
shared envelope: `type` (one of `telemetry`, `heartbeat`, `command`,
`command-ack`), `nodeId` (non-empty string), `timestamp` (ISO 8601 string).
Each `type` MUST additionally satisfy its own field requirements:

- `telemetry`: `sensorType` (non-empty string), `value` (number),
  `unit` (optional string).
- `heartbeat`: `status` (optional string), `uptimeSeconds` (optional
  non-negative number).
- `command`: `commandId` (non-empty string), `action` (non-empty string),
  `params` (optional object, any shape).
- `command-ack`: `commandId` (non-empty string), `success` (boolean),
  `message` (optional string).

A payload that fails envelope or type-specific validation MUST be rejected
before any forwarding occurs.

#### Scenario: Valid telemetry envelope accepted

- GIVEN a JSON payload `{ type: "telemetry", nodeId: "node-1", timestamp: "2026-07-10T10:00:00Z", sensorType: "soil-moisture", value: 42.5, unit: "%" }`
- WHEN it is validated
- THEN validation succeeds and the typed envelope is returned

#### Scenario: Missing required field rejected

- GIVEN a `telemetry` payload with no `value` field
- WHEN it is validated
- THEN validation fails with a descriptive error and nothing is forwarded

#### Scenario: Unknown type rejected

- GIVEN a payload with `type: "unknown-type"`
- WHEN it is validated
- THEN validation fails and nothing is forwarded

---

### Requirement: Node → Kafka Forwarding (Telemetry, Heartbeat, Command-Ack)

The bridge MUST subscribe to `sensors/+/+/telemetry`, `nodes/+/heartbeat`, and
`nodes/+/commands/ack` on the configured MQTT broker. On receiving a message
on any of these topics, it MUST resolve the expected message `type` from the
topic pattern, extract `nodeId` from the topic, parse and validate the
payload, and — on success — publish the validated envelope to the Kafka topic
matching its type, using `nodeId` as the partition key:

| Message type | Kafka topic | Config var | Default |
|---|---|---|---|
| `telemetry` | — | `KAFKA_BRIDGE_TELEMETRY_TOPIC` | `${KAFKA_TOPIC_PREFIX}.telemetry` |
| `heartbeat` | — | `KAFKA_BRIDGE_HEARTBEAT_TOPIC` | `${KAFKA_TOPIC_PREFIX}.heartbeat` |
| `command-ack` | — | `KAFKA_BRIDGE_COMMAND_ACKS_TOPIC` | `${KAFKA_TOPIC_PREFIX}.command-acks` |

On validation failure, the message MUST NOT be published to Kafka, and the
failure MUST be recorded (see "Audit Logging").

#### Scenario: Telemetry relayed to Kafka

- GIVEN the bridge is connected to both the MQTT broker and Kafka
- WHEN a valid `telemetry` payload is published on `sensors/node-1/soil-moisture/telemetry`
- THEN a message with that payload is produced to `gardenia-bridge.telemetry` with key `node-1`

#### Scenario: Heartbeat relayed to Kafka

- GIVEN the bridge is connected to both the MQTT broker and Kafka
- WHEN a valid `heartbeat` payload is published on `nodes/node-1/heartbeat`
- THEN a message with that payload is produced to `gardenia-bridge.heartbeat` with key `node-1`

#### Scenario: Command-ack relayed to Kafka

- GIVEN the bridge is connected to both the MQTT broker and Kafka
- WHEN a valid `command-ack` payload is published on `nodes/node-1/commands/ack`
- THEN a message with that payload is produced to `gardenia-bridge.command-acks` with key `node-1`

#### Scenario: Invalid payload not forwarded

- GIVEN the bridge is connected to both the MQTT broker and Kafka
- WHEN a malformed payload is published on `sensors/node-1/soil-moisture/telemetry`
- THEN no message is produced to `gardenia-bridge.telemetry` (or any other bridge topic)

---

### Requirement: Kafka → Node Forwarding (Command)

The bridge MUST consume from the `gardenia-bridge.commands` Kafka topic
(configurable via `KAFKA_BRIDGE_COMMANDS_TOPIC`). On receiving a message, it
MUST parse and validate the payload as a `command` envelope, and — on success
— publish it to the MQTT topic `nodes/{nodeId}/commands`, where `{nodeId}` is
taken from the validated envelope.

On validation failure, the message MUST NOT be published to MQTT, and the
failure MUST be recorded (see "Audit Logging").

#### Scenario: Command relayed to MQTT

- GIVEN the bridge is connected to both Kafka and the MQTT broker
- WHEN a valid `command` message for `nodeId: "node-1"` is produced to `gardenia-bridge.commands`
- THEN the same payload is published on MQTT topic `nodes/node-1/commands`

#### Scenario: Invalid command not forwarded

- GIVEN the bridge is connected to both Kafka and the MQTT broker
- WHEN a malformed message is produced to `gardenia-bridge.commands`
- THEN no MQTT publish occurs

---

### Requirement: Best-Effort Delivery

The bridge MUST NOT implement retries, dead-letter handling, or delivery
deduplication in this version. MQTT subscriptions and publishes use QoS 0 or
1. A message lost due to a transient broker/network failure on either side is
not retried automatically.

#### Scenario: Kafka produce failure does not crash the bridge

- GIVEN the bridge is connected to the MQTT broker but Kafka is temporarily unreachable
- WHEN a valid `telemetry` message is received over MQTT
- THEN the produce attempt fails, the failure is recorded with an error outcome, and the bridge continues processing subsequent messages without crashing

---

### Requirement: Audit Logging

Every message the bridge processes, in either direction and regardless of
outcome, MUST result in exactly one row written to the local SQLite
`bridge_message_log` table, capturing: direction (`inbound`/`outbound`),
message type (or `unknown` if validation failed before type resolution),
`nodeId` (or null if unavailable), source topic, destination topic (null if
forwarding did not occur), the raw payload as received, outcome
(`success`/`error`), an error reason when applicable, and a processing
timestamp.

Audit logging MUST happen independently of the SQLite write's own success —
a failure to write the audit row MUST be logged but MUST NOT prevent the
underlying message from being forwarded (audit logging is best-effort
observability, not a transactional guarantee tied to the relay itself).

#### Scenario: Successful relay is logged

- GIVEN the bridge successfully relays a valid `telemetry` message
- WHEN the audit log is inspected
- THEN it contains one row with direction=inbound, type=telemetry, outcome=success, and the destination topic set to `gardenia-bridge.telemetry`

#### Scenario: Validation failure is logged

- GIVEN a malformed payload is received on any subscribed MQTT topic
- WHEN the audit log is inspected
- THEN it contains one row with outcome=error, a non-null error reason, and a null destination topic

---

### Requirement: MQTT Connection Configuration

The MQTT broker connection MUST be fully configurable via environment
variables (`MQTT_URL`, optional `MQTT_USERNAME`/`MQTT_PASSWORD`,
`MQTT_CLIENT_ID`), with no broker hardcoded in source. The bridge MUST
reconnect automatically on connection loss and log connection state
transitions (connected, disconnected, reconnecting).

#### Scenario: Broker reachable via env-configured URL

- GIVEN `MQTT_URL=mqtt://localhost:1883` and no credentials set
- WHEN the bridge starts
- THEN it connects to the broker at that URL without authentication

#### Scenario: Reconnects after broker restart

- GIVEN the bridge is connected to the MQTT broker
- WHEN the broker becomes temporarily unreachable and then recovers
- THEN the bridge automatically reconnects without requiring a service restart

---

### Requirement: Bridge Kafka Topic Configuration

The four Kafka topics used by the bridge (`telemetry`, `heartbeat`,
`command-acks`, `commands`) MUST each be independently configurable
(`KAFKA_BRIDGE_TELEMETRY_TOPIC`, `KAFKA_BRIDGE_HEARTBEAT_TOPIC`,
`KAFKA_BRIDGE_COMMAND_ACKS_TOPIC`, `KAFKA_BRIDGE_COMMANDS_TOPIC`), and MUST
reuse the existing Kafka connection configuration (`KAFKA_ENABLED`,
`KAFKA_BROKERS`, `KAFKA_SSL`, `KAFKA_SASL_*`) rather than introducing a
second, parallel set of broker-connection variables.

#### Scenario: Default topic names derived from prefix

- GIVEN `KAFKA_TOPIC_PREFIX=gardenia-bridge` and no explicit topic overrides
- WHEN the bridge starts
- THEN it produces telemetry to `gardenia-bridge.telemetry`, heartbeats to
  `gardenia-bridge.heartbeat`, command-acks to `gardenia-bridge.command-acks`,
  and consumes commands from `gardenia-bridge.commands`

---

### Requirement: Health Readiness

`GET /api/health/ready` MUST report the connectivity state of both the MQTT
client and the bridge's Kafka producer/consumer, alongside the existing
Postgres check.

#### Scenario: Ready when both transports are connected

- GIVEN the bridge is connected to both the MQTT broker and Kafka
- WHEN `GET /api/health/ready` is called
- THEN the response indicates both MQTT and Kafka as healthy

#### Scenario: Not ready when MQTT is disconnected

- GIVEN the bridge cannot reach the configured MQTT broker
- WHEN `GET /api/health/ready` is called
- THEN the response indicates MQTT as unhealthy

---

### Requirement: No Device Registry

The bridge MUST NOT persist or require a pre-registered catalog of nodes or
sensors. Any `nodeId` present in a topic or payload is accepted and relayed
without existence checks against a stored registry.

#### Scenario: Unregistered node's telemetry is still relayed

- GIVEN no prior record of `nodeId: "node-99"` exists anywhere in the bridge
- WHEN a valid `telemetry` message for `node-99` is received over MQTT
- THEN it is relayed to Kafka exactly as any other node's telemetry would be

---

### Requirement: No Business Transport

The `nodes` bounded context MUST NOT expose GraphQL, REST, or MCP endpoints
of its own for reading or writing bridge data. All interaction with the
bridge happens through MQTT and Kafka; the only HTTP surface touched by this
change is the existing health endpoint.

#### Scenario: No GraphQL type or REST controller exists for nodes

- GIVEN the source tree under `src/contexts/nodes/`
- WHEN scanned for a `transport/` subtree
- THEN none exists

---

### Requirement: No Cross-Context Coupling

The `nodes` bounded context MUST NOT import from any other bounded context
under `@contexts/*`.

#### Scenario: No forbidden imports

- GIVEN the source tree under `src/contexts/nodes/`
- WHEN scanned for imports
- THEN no import path matches another `@contexts/<other>/` bounded context

---

## Out of Scope

- Node/device registry, online/offline tracking, device metadata
- MQTT authentication/authorization (per-node credentials or mutual TLS)
- At-least-once delivery, retries, dead-letter handling, deduplication
- Any `gardenia-api` or `gardenia-web` integration (consumer/producer wiring
  outside this repo)
- Read/query API (REST/GraphQL/MCP) over the SQLite audit log
- SQLite audit log retention/rotation policy
- Validation of `command.action`/`command.params` business semantics beyond
  well-formedness of the envelope
