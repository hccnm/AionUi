import { describe, expect, it } from 'vitest';

import { fromWorkspaceRuntimeEntries } from '../src/aionui/common/adapter/workspaceMapper';

describe('workspace runtime tree mapper', () => {
  it('maps workspace_id file entries into the existing conversation workspace tree shape', () => {
    const tree = fromWorkspaceRuntimeEntries(
      [
        { name: 'main.ts', path: 'src/main.ts', type: 'file' },
        { name: 'components', path: 'src/components', type: 'directory' },
      ],
      'Aion Web',
      'src'
    );

    expect(tree).toEqual([
      {
        name: 'src',
        fullPath: 'Aion Web/src',
        relativePath: 'src',
        isDir: true,
        isFile: false,
        children: [
          {
            name: 'main.ts',
            fullPath: 'Aion Web/src/main.ts',
            relativePath: 'src/main.ts',
            isDir: false,
            isFile: true,
          },
          {
            name: 'components',
            fullPath: 'Aion Web/src/components',
            relativePath: 'src/components',
            isDir: true,
            isFile: false,
          },
        ],
      },
    ]);
  });
});
