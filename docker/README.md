# NestJS Template

Sisques Labs' base template for new NestJS services: DDD + CQRS + Hexagonal
architecture, TypeORM/PostgreSQL, optional Kafka event forwarding, REST
(Swagger) + GraphQL (Apollo) transports, structured logging, Sentry,
Prometheus metrics, and an MCP endpoint.

This image ships with **zero bounded contexts** — it's the infrastructure
skeleton new services are cloned from, not a ready-to-run business API.

## Quick start

```bash
docker run -p 3000:3000 \
  -e DATABASE_HOST=host.docker.internal \
  -e DATABASE_PORT=5432 \
  -e DATABASE_USERNAME=postgres \
  -e DATABASE_PASSWORD=secret \
  -e DATABASE_DATABASE=nestjs_template_db \
  sisqueslabs/nestjs-template:latest
```

The container needs a reachable PostgreSQL instance — it does not bundle one.

## Ports

| Port | Purpose |
|------|---------|
| `3000` | HTTP — REST (`/api/*`), GraphQL (`/graphql`), Swagger docs, health, metrics, MCP (see routes below) |

## Routes

| Path | Purpose |
|------|---------|
| `GET /api/health/live` | Liveness probe |
| `GET /api/health/ready` | Readiness probe (checks DB connectivity) |
| `GET /api/metrics` | Prometheus metrics |
| `POST /api/mcp` | MCP (Model Context Protocol) endpoint |
| `POST /graphql` | GraphQL (Apollo) |
| `GET /docs` | Swagger UI |

## Environment variables

| Variable | Default | Required | Notes |
|----------|---------|----------|-------|
| `PORT` | `3000` | No | HTTP port |
| `NODE_ENV` | `production` | No | |
| `DATABASE_DRIVER` | `postgres` | No | Only `postgres` is supported |
| `DATABASE_HOST` | — | **Yes** | |
| `DATABASE_PORT` | `5432` | No | |
| `DATABASE_USERNAME` | — | **Yes** | |
| `DATABASE_PASSWORD` | — | **Yes** | |
| `DATABASE_DATABASE` | — | **Yes** | |
| `DATABASE_MIGRATIONS_RUN` | `true` | No | Runs pending migrations on boot |
| `CORS_ORIGINS` | — | Production only | Comma-separated allowed origins |
| `SENTRY_DSN` | — | No | Sentry error reporting disabled when unset |
| `KAFKA_ENABLED` | `false` | No | Domain event forwarding; app boots fine without a broker when disabled |
| `KAFKA_BROKERS` | — | If Kafka enabled | Comma-separated broker list |
| `LOG_LEVEL` | `info` | No | |

See the project's `.env.example` for the full list.

## Tags

- `latest` — most recent stable release (`main` branch)
- `x.y.z` — specific stable release
- `x.y.z-alpha.n` / `-beta.n` / `-rc.n` — prereleases from `develop`/`staging`

## Source

https://github.com/sisques-labs/nestjs-template
