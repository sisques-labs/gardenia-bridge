---
name: architecture
description: "Trigger: new context, add command/query/aggregate, which layer, where does X go. Enforce DDD+CQRS+Hexagonal layer rules and file naming for services built from this template."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Apply this skill whenever creating or modifying any file under `src/contexts/` or `src/core/`.

## Hard Rules

1. **Constructor = hydration only.** Never call `this.apply()` inside a constructor. Domain events are emitted exclusively from named instance methods (`create()`, `delete()`, etc.).
2. **Resolvers use the bus, never services.** `CommandBus.execute()` / `QueryBus.execute()` only — no direct service injection in transport.
3. **`MutationResponseGraphQLMapper` is global.** It is provided by `SharedGraphQLModule` (imported once in `CoreModule`). Never add it to a bounded-context module's providers.
7. **New bounded context module → register it, don't wire it loose.** Add it to `CONTEXT_MODULES` in `src/contexts/contexts.module.ts`. Never import a context module directly in `AppModule`.
4. **Repository interfaces live in domain.** Infrastructure classes implement them; domain never imports from infrastructure.
5. **No module compilation tests.** Do not create `*.module.spec.ts` files.
6. **Unit tests = manual instantiation.** Use `jest.Mocked<T>`, co-located with source. No `@nestjs/testing` in unit specs (enforced by ESLint `no-restricted-imports` on `src/**/*.spec.ts`).

## Test Layers

| Layer | Location | DB | `@nestjs/testing` |
|-------|----------|-----|-------------------|
| Unit | `src/**/*.spec.ts` | Mocked | **Forbidden** |
| Integration | `test/integration/**/*.integration-spec.ts` | Real Postgres | **Allowed** |
| API E2E | `test/**/*.e2e-spec.ts` | Real Postgres | **Allowed** |

Integration specs bootstrap slim bounded-context modules via a `test/helpers/integration-bootstrap.ts` you add alongside the first context. E2E specs use a `test/helpers/app-bootstrap.ts` with the full `AppModule`.

## Bounded Context Structure

```
src/contexts/{context}/
├── domain/
│   ├── aggregates/        {name}.aggregate.ts       — extends BaseAggregate; create() emits event
│   ├── builders/          {name}.builder.ts          — fluent builder; build() returns aggregate
│   ├── events/            {name}-{verb}/{name}-{verb}.event.ts
│   ├── exceptions/        {reason}.exception.ts      — extend BaseException from nestjs-kit
│   ├── interfaces/        {name}.interface.ts        — aggregate field shape
│   ├── primitives/        {name}.primitives.ts       — plain object with all raw values
│   ├── repositories/
│   │   ├── read/          {name}-read.repository.ts  — interface + DI token (Symbol)
│   │   └── write/         {name}-write.repository.ts — interface + DI token (Symbol)
│   ├── value-objects/     {name}/{name}.vo.ts        — immutable, validate in constructor
│   ├── view-models/       {name}.view-model.ts       — read-side projection
│   └── enums/             {name}.enum.ts
├── application/
│   ├── commands/          {name}/{name}.command.ts + {name}.handler.ts
│   ├── queries/            {name}/{name}.query.ts  + {name}.handler.ts
│   └── services/
│       ├── read/          assert-{x}-exists.service.ts
│       └── write/         assert-{x}-available.service.ts
├── infrastructure/
│   ├── persistence/typeorm/
│   │   ├── entities/      {name}.entity.ts           — TypeORM @Entity
│   │   ├── mappers/       {name}-typeorm.mapper.ts   — entity ↔ aggregate
│   │   └── repositories/  {name}-typeorm-{read|write}.repository.ts
│   ├── guards/            {name}.guard.ts
│   ├── strategies/        {name}.strategy.ts
│   └── decorators/        {name}.decorator.ts
├── transport/
│   ├── graphql/
│   │   ├── resolvers/     {name}.resolver.ts         — CommandBus/QueryBus only
│   │   ├── dtos/          {name}.input.ts
│   │   │                  {name}-filter.input.ts     — createFilterInput({Name}QueryableField, '{Name}')
│   │   │                  {name}-sort.input.ts        — createSortInput({Name}QueryableField, '{Name}')
│   │   ├── objects/       {name}.object.ts
│   │   ├── mappers/       {name}.mapper.ts
│   │   ├── enums/         {name}-registered-enums.graphql.ts
│   │   │                  {name}-queryable-field.enum.ts  — whitelist for findByCriteria
│   │   └── registries/    {name}-filterable-fields.registry.ts — FilterFieldRegistry, +.spec.ts
│   ├── rest/
│   │   ├── {name}.controller.ts
│   │   └── dtos/          {name}.dto.ts
│   └── mcp/
│       ├── tools/         {name}.tool.ts             — {Name}McpTool implements IMcpTool (@sisques-labs/nestjs-kit/mcp)
│       └── schemas/       {name}.schema.ts            — Zod inputSchema for the tool above
└── {context}.module.ts
```

Drop the `graphql/`, `rest/`, or `mcp/` subtree entirely for a context that doesn't need that transport — none of the three is mandatory per context.

## Decision Gates

| Question | Answer |
|----------|--------|
| Where does business logic live? | `domain/aggregates/` — inside aggregate methods |
| Where does orchestration live? | `application/commands/` or `application/queries/` handlers |
| Where does DB mapping live? | `infrastructure/persistence/typeorm/mappers/` |
| Where does HTTP/GraphQL/MCP wiring live? | `transport/` — no logic, only bus dispatch |
| Cross-context shared utilities? | `src/core/` (filters, config, guards) |
| Adding/changing a `findByCriteria` query? | See "Find-By-Criteria Filters" below — mandatory pattern, not optional |
| Where do I register a new context module? | `CONTEXT_MODULES` array in `src/contexts/contexts.module.ts` |

## Find-By-Criteria Filters (mandatory, every context)

Every `{context}sFindByCriteria` query MUST use the type-safe Criteria
pattern below — no exception for contexts with only one or two filterable
fields. This is the pattern that prevents two recurring bugs: `findByCriteria`
silently ignoring `criteria.filters` (pagination applied, filters dropped),
and `filter.field` interpolated straight into SQL with zero validation.

1. **Queryable field enum** — `transport/graphql/enums/{name}-queryable-field.enum.ts`:
   a `{Name}QueryableField` enum whitelisting every scalar/FK field on that
   context's ViewModel that maps to a real column. Register it via
   `registerEnumType` as `{Name}QueryableFieldEnum` in the context's existing
   `{name}-registered-enums.graphql.ts`.
   - Exclude resolved/nested fields that aren't real columns (e.g. a joined
     child ViewModel) — expose their `*Id` counterpart instead.
2. **Filterable-fields registry** — `transport/graphql/registries/{name}-filterable-fields.registry.ts`:
   a `{name}FilterableFields: FilterFieldRegistry<{Name}QueryableField>`
   (from `@sisques-labs/nestjs-kit`) mapping each field to its expected value
   shape (`'string' | 'number' | 'boolean' | 'uuid' | 'date'`). Enum-backed
   columns MUST use `{ type: 'enum', enum: TheRealDomainEnum }` — never a
   duplicated string list; the domain enum is the single source of truth.
   Co-locate a `.spec.ts` asserting every enum value has a registry entry,
   plus enum-membership and whitelist-rejection cases.
3. **Filter/sort inputs** — `transport/graphql/dtos/requests/{name}-filter.input.ts` / `-sort.input.ts`:
   ```ts
   @InputType('{Name}FilterInput')
   export class {Name}FilterInput extends createFilterInput({Name}QueryableField, '{Name}') {}
   ```
   (same shape for `{Name}SortInput` / `createSortInput`). Both factories come
   from `@sisques-labs/nestjs-kit` and register their generated base class
   `{ isAbstract: true }` — the `@InputType(name)` on this subclass is what
   actually emits the concrete GraphQL type.
4. **Request DTO** overrides `filters`/`sorts` to the typed inputs (`declare`
   + `@Type()`), keeping the existing class name and GraphQL type name:
   ```ts
   @Field(() => [{Name}FilterInput], { nullable: true, defaultValue: [] })
   @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => {Name}FilterInput)
   declare filters?: {Name}FilterInput[];
   ```
5. **Resolver wiring**: `new FilterValidationPipe({name}FilterableFields)` as
   the third arg of `@Args('input', { nullable: true }, ...)` on the
   `{name}sFindByCriteria` method.
6. **Read repository**: `findByCriteria` MUST translate `criteria.filters` via
   `QueryBuilder` — never just apply pagination/sort and drop filters. Cover
   all 8 `FilterOperator` values (`EQUALS`, `NOT_EQUALS`, `LIKE`, `IN`,
   `GREATER_THAN(_OR_EQUAL)`, `LESS_THAN(_OR_EQUAL)`).

## Naming Conventions

| Artifact | Pattern | Example |
|----------|---------|---------|
| Aggregate | `{name}.aggregate.ts` | `order.aggregate.ts` |
| Event | `{name}-{past-verb}.event.ts` | `order-created.event.ts` |
| Exception | `{reason}.exception.ts` | `order-not-found.exception.ts` |
| Command | `{verb}-{name}.command.ts` | `create-order.command.ts` |
| Query | `{name}-find-by-{x}.query.ts` | `order-find-by-id.query.ts` |
| VO | `{name}.vo.ts` or `{name}.value-object.ts` | `order-status.value-object.ts` |
| Spec | co-located, same name + `.spec.ts` | `order.aggregate.spec.ts` |
| Queryable field enum | `{name}-queryable-field.enum.ts` | `order-queryable-field.enum.ts` |
| Filterable-fields registry | `{name}-filterable-fields.registry.ts` (+ `.spec.ts`) | `order-filterable-fields.registry.ts` |
| Filter input | `{name}-filter.input.ts`, class `{Name}FilterInput` | `order-filter.input.ts` |
| Sort input | `{name}-sort.input.ts`, class `{Name}SortInput` | `order-sort.input.ts` |

## References

- `src/core/README.md` (add one, mirroring `src/core/health/` and
  `src/core/observability/`, as new cross-cutting modules are added) —
  cross-cutting concerns. Kafka event forwarding and Prometheus metrics live
  in `@sisques-labs/nestjs-kit/messaging` and `/metrics` — see that package's
  docs, not a local README.
- `.claude/skills/architecture/assets/aggregate-template.ts.template` — aggregate starter
- Once the first bounded context exists, add its `README.md` at
  `src/contexts/{context}/README.md` and reference it here as the canonical
  example for the next context.
