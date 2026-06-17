import { describe, expect, it } from 'vitest';
import { buildHeaders, getCsrfTokenFromCookie } from '../src/api/csrf';

describe('csrf helpers', () => {
  it('reads the configured CSRF cookie value', () => {
    expect(getCsrfTokenFromCookie('foo=1; aionui-csrf-token=abc%20123; bar=2')).toBe('abc 123');
  });

  it('adds CSRF header only for state-changing methods', () => {
    expect(buildHeaders('GET', undefined, 'aionui-csrf-token=abc')).toEqual({});
    expect(buildHeaders('POST', { 'Content-Type': 'application/json' }, 'aionui-csrf-token=abc')).toEqual({
      'Content-Type': 'application/json',
      'x-csrf-token': 'abc',
    });
  });
});
