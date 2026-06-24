import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { authSessionStore } from '../src/aionui/common/auth/session';
import { createPhase2AuthAdapter, hasAnyPermission, hasPermission } from '../src/aionui/common/auth/phase2';

const currentUser = {
  id: 'usr_1',
  phone: '13800138000',
  username: 'zhangsan',
  display_name: '张三',
  roles: [{ id: 'role_admin', role_key: 'super_admin', role_name: '超级管理员', permissions: ['*'] }],
  permission_flags: ['*', 'workspace:own'],
  is_admin: true,
};

describe('phase2 auth adapter', () => {
  beforeEach(() => {
    authSessionStore.clearSession();
  });

  afterEach(() => {
    authSessionStore.clearSession();
    vi.unstubAllGlobals();
  });

  it('unwraps /api/auth/me envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: currentUser, trace_id: 'tr_1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createPhase2AuthAdapter({ fetcher });

    await expect(adapter.getMe()).resolves.toEqual(currentUser);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/me', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
  });

  it('posts username and password to phase2 login endpoint', async () => {
    const loginResponse = { token: 'token-1', user: { id: 'usr_1', username: '13800138000' } };
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: loginResponse }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createPhase2AuthAdapter({ fetcher });

    await expect(adapter.login('13800138000', 'pass-1')).resolves.toEqual(loginResponse);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username":"13800138000","password":"pass-1"}',
      signal: undefined,
    });
  });

  it('does not attach stale bearer auth to default login requests', async () => {
    authSessionStore.setSession({ token: 'stale-token', currentUser: null, loginMode: 'password' });
    const loginResponse = { token: 'token-1', user: { id: 'usr_1', username: '13800138000' } };
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: loginResponse }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);
    const adapter = createPhase2AuthAdapter();

    await expect(adapter.login('13800138000', 'pass-1')).resolves.toEqual(loginResponse);
    expect(String(fetchSpy.mock.calls[0]?.[0])).toMatch(/\/api\/auth\/login$/);
    expect(fetchSpy.mock.calls[0]?.[1]).toEqual({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"username":"13800138000","password":"pass-1"}',
      signal: undefined,
    });
  });

  it('posts logout to phase2 logout endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createPhase2AuthAdapter({ fetcher });

    await expect(adapter.logout()).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledWith('/api/auth/logout', {
      method: 'POST',
      headers: {},
      signal: undefined,
    });
  });

  it('throws backend envelope message on request failure', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'UNAUTHENTICATED', message: 'invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createPhase2AuthAdapter({ fetcher });

    await expect(adapter.getMe()).rejects.toThrow('invalid token');
  });

  it('checks permission flags without reading roles', () => {
    expect(hasPermission(currentUser, 'admin:user:list')).toBe(true);
    expect(hasPermission(currentUser, 'admin:role:list')).toBe(true);
    expect(hasAnyPermission(currentUser, ['admin:role:list', 'admin:user:list'])).toBe(true);
  });
});
