import { describe, expect, it } from 'vitest';
import { shouldEnableFileSnapshot } from './useFileChanges';

describe('shouldEnableFileSnapshot', () => {
  it('returns false for temporary workspaces even on changes tab', () => {
    expect(
      shouldEnableFileSnapshot({
        workspace: '/tmp/workspace',
        activeTab: 'changes',
        isTemporaryWorkspace: true,
      })
    ).toBe(false);
  });

  it('returns false before the changes tab is opened', () => {
    expect(
      shouldEnableFileSnapshot({
        workspace: '/repo/workspace',
        activeTab: 'files',
        isTemporaryWorkspace: false,
      })
    ).toBe(false);
  });

  it('returns true for a non-temporary workspace on the changes tab', () => {
    expect(
      shouldEnableFileSnapshot({
        workspace: '/repo/workspace',
        activeTab: 'changes',
        isTemporaryWorkspace: false,
      })
    ).toBe(true);
  });
});
