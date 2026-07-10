'use strict';

/**
 * Generates `src/core/messaging/domain/topics/aggregate-module.map.generated.ts`
 * from the bounded-context folder layout.
 *
 * Convention: every aggregate lives at
 * `src/contexts/<module>/domain/aggregates/*.aggregate.ts`, and each exported
 * `*Aggregate` class is routed to the Kafka topic of its `<module>` folder. The
 * mapping is therefore fully derivable from the filesystem — no central file has
 * to be hand-edited when a new module/aggregate is added.
 *
 * Usage:
 *   ts-node scripts/generate-aggregate-module-map.ts           # write the file
 *   ts-node scripts/generate-aggregate-module-map.ts --check   # fail if stale
 */

import { Dirent, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const REPO_ROOT = join(__dirname, '..');
const CONTEXTS_DIR = join(REPO_ROOT, 'src', 'contexts');

export const OUTPUT_PATH = join(
  REPO_ROOT,
  'src',
  'core',
  'messaging',
  'domain',
  'topics',
  'aggregate-module.map.generated.ts',
);

export interface AggregateMapping {
  /** Aggregate root class name, e.g. `PlantAggregate`. */
  className: string;
  /** Bounded-context module / Kafka topic suffix, e.g. `plants`. */
  module: string;
}

const EXPORTED_AGGREGATE = /export\s+class\s+(\w+Aggregate)\b/g;

/**
 * Scans `src/contexts/<module>/domain/aggregates/*.aggregate.ts` and resolves the
 * `aggregateRootType -> module` pairs, sorted by class name for deterministic
 * output. Throws if the same class name maps to two different modules.
 */
export function collectMappings(): AggregateMapping[] {
  const byClassName = new Map<string, string>();

  let contextEntries: Dirent<string>[];
  try {
    contextEntries = readdirSync(CONTEXTS_DIR, {
      withFileTypes: true,
      encoding: 'utf8',
    });
  } catch {
    // No bounded contexts yet.
    return [];
  }

  for (const module of contextEntries) {
    if (!module.isDirectory()) continue;

    const aggregatesDir = join(
      CONTEXTS_DIR,
      module.name,
      'domain',
      'aggregates',
    );

    let files: string[];
    try {
      files = readdirSync(aggregatesDir);
    } catch {
      // A context without aggregates has no such folder.
      continue;
    }

    for (const file of files) {
      if (!file.endsWith('.aggregate.ts') || file.endsWith('.spec.ts')) {
        continue;
      }

      const source = readFileSync(join(aggregatesDir, file), 'utf8');
      for (const match of source.matchAll(EXPORTED_AGGREGATE)) {
        const className = match[1];
        const existing = byClassName.get(className);
        if (existing && existing !== module.name) {
          throw new Error(
            `Ambiguous aggregate '${className}': declared in both '${existing}' ` +
              `and '${module.name}'. Aggregate class names must be unique.`,
          );
        }
        byClassName.set(className, module.name);
      }
    }
  }

  return [...byClassName.entries()]
    .map(([className, module]) => ({ className, module }))
    .sort((a, b) => (a.className < b.className ? -1 : 1));
}

/** Renders the generated TypeScript module (prettier-compatible). */
export function render(mappings: AggregateMapping[]): string {
  const entries = mappings
    .map(({ className, module }) => `  ${className}: '${module}',`)
    .join('\n');

  return `/**
 * AUTO-GENERATED FILE — DO NOT EDIT BY HAND.
 *
 * Maps each aggregate root type to its bounded-context module (the Kafka topic
 * suffix \`\${prefix}.\${module}\`). Derived by scanning
 * \`src/contexts/<module>/domain/aggregates/*.aggregate.ts\`: the owning
 * \`<module>\` folder is the topic, and every exported \`*Aggregate\` class is a key.
 *
 * Regenerate with \`pnpm gen:topics\`. The pre-commit hook and CI
 * (\`pnpm gen:topics:check\`) keep this file in sync, so creating a new aggregate
 * needs no manual edit here.
 *
 * @see scripts/generate-aggregate-module-map.ts
 */
export const AGGREGATE_MODULE_MAP: Readonly<Record<string, string>> = {${entries ? `\n${entries}\n` : ''}};
`;
}

function main(): void {
  const mappings = collectMappings();
  const content = render(mappings);
  const outRelative = relative(REPO_ROOT, OUTPUT_PATH);

  if (process.argv.includes('--check')) {
    let current = '';
    try {
      current = readFileSync(OUTPUT_PATH, 'utf8');
    } catch {
      // Missing file — treated as out of date below.
    }
    if (current !== content) {
      console.error(
        `✗ ${outRelative} is out of date.\n` +
          `  Run \`pnpm gen:topics\` and commit the result.`,
      );
      process.exit(1);
    }
    console.log(
      `✓ ${outRelative} is up to date (${mappings.length} aggregates).`,
    );
    return;
  }

  writeFileSync(OUTPUT_PATH, content);
  console.log(`Wrote ${outRelative} (${mappings.length} aggregates).`);
}

if (require.main === module) {
  main();
}
