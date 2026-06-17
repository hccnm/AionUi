import { beforeEach, describe, expect, it, vi } from 'vitest';
import { request } from '../src/api/httpClient';

describe('httpClient', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends browser credentials on all requests', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await request('/api/conversations', { method: 'GET', backendBaseUrl: 'https://api.example.com' });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/api/conversations', {
      method: 'GET',
      headers: {},
      credentials: 'include',
      body: undefined,
      signal: undefined,
    });
  });

  it('serializes JSON body and adds CSRF header for POST', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { id: 'conv-1' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await request('/api/conversations', {
      method: 'POST',
      body: { name: 'Test' },
      backendBaseUrl: 'https://api.example.com',
      cookie: 'aionui-csrf-token=csrf-1',
    });

    expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/api/conversations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'csrf-1',
      },
      credentials: 'include',
      body: '{"name":"Test"}',
      signal: undefined,
    });
  });
});
