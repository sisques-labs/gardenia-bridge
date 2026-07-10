/**
 * AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Maps each aggregate root type to its bounded-context module (the Kafka topic
 * suffix `${prefix}.${module}`). Derived by scanning
 * `src/contexts/<module>/domain/aggregates/*.aggregate.ts`: the owning
 * `<module>` folder is the topic, and every exported `*Aggregate` class is a key.
 *
 * Regenerate with `pnpm gen:topics`. The pre-commit hook and CI
 * (`pnpm gen:topics:check`) keep this file in sync, so creating a new aggregate
 * needs no manual edit here.
 *
 * @see scripts/generate-aggregate-module-map.ts
 */
export const AGGREGATE_MODULE_MAP: Readonly<Record<string, string>> = {};
