import { describe, expect, it } from 'vitest';

import { getConfigBootstrapAction } from '../src/app/configBootstrap';

describe('config bootstrap action', () => {
  it('does not reset config while auth status is still checking', () => {
    expect(getConfigBootstrapAction('checking')).toBe('wait');
  });

  it('resets config only after auth is known to be unauthenticated', () => {
    expect(getConfigBootstrapAction('unauthenticated')).toBe('reset');
  });

  it('initializes config after auth is authenticated', () => {
    expect(getConfigBootstrapAction('authenticated')).toBe('initialize');
  });
});
