import { describe, expect, it, vi } from 'vitest';

import { createAuthSessionStore } from '../src/aionui/common/auth/session';
import { createAuthenticatedWebSocket } from '../src/api/wsClient';

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

describe('wsClient', () => {
  it('fetches ws token and passes it as WebSocket subprotocol', async () => {
    const store = createAuthSessionStore(createMemoryStorage());
    store.setSession({
      token: 'token-1',
      user: { id: 'user-1', username: 'admin' },
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, ws_token: 'ws-token-1', expires_in: 300 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const sockets: Array<{ url: string; protocols?: string | string[] }> = [];
    class FakeWebSocket {
      constructor(
        public readonly url: string,
        public readonly protocols?: string | string[]
      ) {
        sockets.push({ url, protocols });
      }
    }

    await createAuthenticatedWebSocket({
      backendBaseUrl: 'https://api.example.com',
      fetchImpl,
      sessionStore: store,
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/api/ws-token', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer token-1',
      },
      body: undefined,
      signal: undefined,
    });
    expect(sockets).toEqual([{ url: 'wss://api.example.com/ws', protocols: ['ws-token-1'] }]);
  });
});
