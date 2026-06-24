import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthSessionStore } from '../src/aionui/common/auth/session';
import { request } from '../src/api/httpClient';

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe('httpClient', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('adds bearer auth to protected requests', async () => {
    const store = createAuthSessionStore(createMemoryStorage());
    store.setSession({
      token: 'token-1',
      user: { id: 'user-1', username: 'admin' },
    });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await request('/api/conversations', {
      method: 'GET',
      backendBaseUrl: 'https://api.example.com',
      sessionStore: store,
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/api/conversations', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-1',
      },
      body: undefined,
      signal: undefined,
    });
  });

  it('refreshes token once on 401 and retries the original request', async () => {
    const store = createAuthSessionStore(createMemoryStorage());
    store.setSession({
      token: 'token-old',
      currentUser: null,
      loginMode: 'password',
    });
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: false, error: 'expired' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, token: 'token-new' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { ok: true } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );
    vi.stubGlobal('fetch', fetchSpy);

    await request('/api/conversations', {
      method: 'GET',
      backendBaseUrl: 'https://api.example.com',
      sessionStore: store,
    });

    expect(fetchSpy).toHaveBeenNthCalledWith(1, 'https://api.example.com/api/conversations', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-old',
      },
      body: undefined,
      signal: undefined,
    });
    expect(fetchSpy).toHaveBeenNthCalledWith(2, 'https://api.example.com/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"token":"token-old"}',
      signal: undefined,
    });
    expect(fetchSpy).toHaveBeenNthCalledWith(3, 'https://api.example.com/api/conversations', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-new',
      },
      body: undefined,
      signal: undefined,
    });
    expect(store.getToken()).toBe('token-new');
  });

  it('does not add bearer auth to public auth status requests', async () => {
    const store = createAuthSessionStore(createMemoryStorage());
    store.setSession({
      token: 'token-1',
      user: { id: 'user-1', username: 'admin' },
    });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, needs_setup: false, user_count: 1, is_authenticated: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await request('/api/auth/status', {
      method: 'GET',
      backendBaseUrl: 'https://api.example.com',
      sessionStore: store,
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/api/auth/status', {
      method: 'GET',
      headers: {},
      body: undefined,
      signal: undefined,
    });
  });

  it('does not refresh gateway sessions on 401', async () => {
    const store = createAuthSessionStore(createMemoryStorage());
    store.setSession({ token: 'legacy-token', currentUser: null, loginMode: 'gateway' });
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 'UNAUTHENTICATED', message: 'expired' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await expect(
      request('/api/conversations', {
        method: 'GET',
        backendBaseUrl: 'https://api.example.com',
        sessionStore: store,
      })
    ).rejects.toMatchObject({ status: 401 });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/api/conversations', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer legacy-token',
      },
      body: undefined,
      signal: undefined,
    });
  });
});
