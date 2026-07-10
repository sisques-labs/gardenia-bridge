# NestJS Template

Sisques Labs' base template for new NestJS services: **DDD + CQRS + Hexagonal**
architecture, TypeORM/PostgreSQL, optional Kafka event forwarding, REST
(Swagger) + GraphQL (Apollo) transports, structured logging
(`@sisques-labs/nestjs-kit` + Winston), Sentry, Prometheus metrics, an MCP
endpoint, health checks, and the CI/CD workflows this org uses in production —
all wired and ready to clone into a new service.

It ships with **zero bounded contexts** (`src/contexts/`) on purpose: the
cross-cutting infrastructure (`src/core/`, `src/support/`) is the whole point
of this repo, and the first context your new service adds defines the pattern
every subsequent one follows (see the `architecture` skill in
`.claude/skills/architecture/SKILL.md`).

## Using this template for a new service

1. Create the new repo from this template (GitHub "Use this template", or
   clone + re-init git).
2. Rename the placeholder identifiers in one shot:
   ```bash
   scripts/rename-service.sh orders-api "Orders API"
   pnpm install
   ```
   This rewrites every occurrence of `nestjs-template` / `NestJS Template` —
   `package.json`, Docker image names in `.github/workflows/`, the Kafka
   client id/topic prefix defaults, Sentry release, Prometheus
   `defaultLabels.app`, the MCP server name, docker-compose database names,
   and this README.
3. Copy `.env.example` to `.env` and fill in real values.
4. `pnpm test:db:up` to start a local Postgres, then `pnpm dev`.
5. Add your first bounded context under `src/contexts/` and register its
   module in `CONTEXT_MODULES` in `src/contexts/contexts.module.ts` — invoke
   the `architecture` skill (or read `.claude/skills/architecture/SKILL.md`
   directly) for the DDD+CQRS+Hexagonal layer rules and file naming.

## What's included

| Area | Where | Notes |
|------|-------|-------|
| Config + env validation | `src/core/config/` | Zod-validated env vars, CORS origin resolution |
| Health checks | `src/core/health/` | `GET /api/health/live` (liveness), `GET /api/health/ready` (DB ping via `@nestjs/terminus`) |
| Logging | `src/support/logging/` | Winston via `@sisques-labs/nestjs-kit`, JSON file + console transports |
| Kafka event forwarding | `@sisques-labs/nestjs-kit/messaging` (wired in `src/core/core.module.ts`); `src/core/messaging/` keeps only the app-local, auto-generated aggregate→topic map | Opt-in (`KAFKA_ENABLED`), no-op when disabled |
| Prometheus metrics | `@sisques-labs/nestjs-kit/metrics` (wired in `src/core/core.module.ts`) | `GET /api/metrics`, HTTP (REST+GraphQL) + CQRS instrumentation |
| Sentry | `src/core/observability/` | Disabled until `SENTRY_DSN` is set |
| MCP (Model Context Protocol) | `@sisques-labs/nestjs-kit/mcp` (wired in `src/core/core.module.ts`) | `POST /api/mcp`, per-request server, tool auto-discovery |
| REST + GraphQL | `src/main.ts`, `src/core/core.module.ts` | Swagger at `/docs`, Apollo GraphQL at `/graphql` (drop whichever transport you don't need) |
| Database | `src/database/`, TypeORM | Postgres only; migrations in `src/database/migrations/` |
| CI/CD | `.github/workflows/` | `ci.yml` (lint+test+build+e2e+integration), `docker.yml` (PR smoke build), `release.yml` / `release-train.yml` (via `sisques-labs/workflows`) |
| Dev workflow | `AGENTS.md`, `.claude/`, `openspec/` | Architecture skill, OpenSpec propose/apply/archive skills, project conventions in `openspec/config.yaml` |

## Deliberately not included

These are common enough that they shouldn't be baked into every service, but
specific enough that they'd bias the template toward one shape:

- **Auth** (JWT/OAuth/sessions) and **multi-tenancy** — add what your service
  actually needs; the MCP module's `contextBuilder` option (see
  `McpModule.forRoot(...)` in `src/core/core.module.ts`, and `IMcpContextBuilder`
  from `@sisques-labs/nestjs-kit/mcp`) and `src/core/filters/base-exception.filter.ts`
  both have a documented extension point for when you do.
- **Bounded contexts / business domain** — this is infrastructure only.
- **MongoDB** — `@sisques-labs/nestjs-kit/mongodb` is available if a service
  needs it alongside or instead of Postgres.

## Local development

```bash
pnpm install
pnpm test:db:up      # Postgres on localhost:5434 (dev) — see docker-compose.yml
pnpm dev              # nest start --watch
```

| Script | Description |
|--------|-------------|
| `pnpm dev` / `pnpm debug` / `pnpm prod` | Run the app (watch / debug / prod) |
| `pnpm lint` | ESLint with `--fix` |
| `pnpm test` / `pnpm test:cov` | Unit tests (Jest, co-located `*.spec.ts`) |
| `pnpm test:e2e` | E2E tests against a real Postgres (`docker-compose.test.yml`) |
| `pnpm test:integration` | Integration tests (persistence boundaries) |
| `pnpm migration:generate` / `:run` / `:revert` | TypeORM migrations |
| `pnpm gen:topics` / `:check` | Regenerate/verify the Kafka aggregate→module map |

Husky runs `pnpm gen:topics` + `lint-staged` on **pre-commit**, and
`pnpm build && pnpm test:changed` on **pre-push**.

See `.env.example` for every environment variable this service reads.

## Architecture

DDD + CQRS + Hexagonal (Screaming Architecture). Full rules, file naming, and
the mandatory find-by-criteria filter pattern live in
`.claude/skills/architecture/SKILL.md`; project-wide conventions (tech stack,
testing layers, apply-time rules) live in `openspec/config.yaml`.
