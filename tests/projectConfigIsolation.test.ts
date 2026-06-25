import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const testsDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(testsDir, '..');

describe('project config isolation', () => {
  it('keeps build configuration self-contained inside AionWeb', async () => {
    const [unoConfigSource, viteConfigSource, tsconfigSource, packageSource] = await Promise.all([
      readFile(resolve(projectRoot, 'uno.config.ts'), 'utf8'),
      readFile(resolve(projectRoot, 'vite.config.ts'), 'utf8'),
      readFile(resolve(projectRoot, 'tsconfig.json'), 'utf8'),
      readFile(resolve(projectRoot, 'package.json'), 'utf8'),
    ]);

    expect(unoConfigSource).not.toContain('../AionUi');
    expect(viteConfigSource).not.toContain('../AionUi');
    expect(tsconfigSource).not.toContain('../AionUi');

    const packageJson = JSON.parse(packageSource) as { devDependencies?: Record<string, string> };
    expect(packageJson.devDependencies).toHaveProperty('unocss-preset-extra');
  });
});
