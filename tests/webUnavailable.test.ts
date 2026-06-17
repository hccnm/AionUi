import { describe, expect, it } from 'vitest';
import {
  WebUnavailableError,
  getUnmigratedCapability,
  listUnmigratedCapabilities,
} from '../src/platform/webUnavailable';

describe('web unavailable capabilities', () => {
  it('creates typed errors for current-PC local-native features', () => {
    const error = new WebUnavailableError('local-shell-open', 'Opening current PC files is not available in AionWeb');

    expect(error.name).toBe('WebUnavailableError');
    expect(error.capability).toBe('local-shell-open');
    expect(error.message).toContain('current PC');
  });

  it('records local-native features with remote-core target behavior', () => {
    const shellOpen = getUnmigratedCapability('local-shell-open');
    const directorySelection = getUnmigratedCapability('local-directory-selection');
    const capabilities = listUnmigratedCapabilities();
    const capabilityIds = capabilities.map((capability) => capability.id as string);

    expect(shellOpen?.webTargetBehavior).toContain('remote server');
    expect(directorySelection?.currentHandling).toBe('unavailable');
    expect(capabilityIds).not.toContain('remote-workspace-tree');
  });
});
