import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('nodes bounded context — no cross-context imports', () => {
  it('imports no other bounded context under @contexts/*', () => {
    const contextDir = join(__dirname);

    const output = execSync(
      `find "${contextDir}" -name "*.ts" -not -name "*.spec.ts" -not -name "*.e2e-spec.ts"`,
    )
      .toString()
      .trim();

    const files = output.split('\n').filter(Boolean);
    expect(files.length).toBeGreaterThan(0);

    const forbidden = /from\s+['"](?:.*\/)?@contexts\/(?!nodes[/'"])([\w-]+)/;
    const violations: string[] = [];

    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      if (forbidden.test(content)) {
        violations.push(file.replace(contextDir + '/', ''));
      }
    }

    expect(violations).toEqual([]);
  });
});
