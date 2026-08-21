import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

describe('native seed module resolution', () => {
  it('loads InitialAdminService with Node strip-types', () => {
    const servicePath = path.resolve(__dirname, '../../src/services/InitialAdminService.ts');
    const moduleUrl = pathToFileURL(servicePath).href;
    const script = `import(${JSON.stringify(moduleUrl)}).catch((error) => { console.error(error); process.exit(1); });`;

    expect(() => execFileSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '--eval', script],
      { cwd: path.resolve(__dirname, '../..'), stdio: 'pipe' },
    )).not.toThrow();
  });
});
