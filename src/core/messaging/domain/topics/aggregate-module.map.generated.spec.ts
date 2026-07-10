import { readFileSync } from 'fs';

import { AGGREGATE_MODULE_MAP } from '@core/messaging/domain/topics/aggregate-module.map.generated';
import {
  OUTPUT_PATH,
  collectMappings,
  render,
} from '../../../../../scripts/generate-aggregate-module-map';

describe('aggregate-module.map.generated', () => {
  it('is in sync with the aggregates on disk (run `pnpm gen:topics`)', () => {
    const onDisk = readFileSync(OUTPUT_PATH, 'utf8');
    const expected = render(collectMappings());

    expect(onDisk).toBe(expected);
  });

  it('routes every aggregate under src/contexts to its bounded-context module', () => {
    const fromDisk = Object.fromEntries(
      collectMappings().map(({ className, module }) => [className, module]),
    );

    expect({ ...AGGREGATE_MODULE_MAP }).toEqual(fromDisk);
  });
});
