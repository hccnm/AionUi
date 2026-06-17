import { describe, expect, it, vi } from 'vitest';
import { createAuthenticatedWebSocket } from '../src/api/wsClient';

describe('wsClient', () => {
  it('fetches ws token and passes it as WebSocket subprotocol', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ data: { token: 'ws-token-1' } }), {
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
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });

    expect(fetchImpl).toHaveBeenCalledWith('https://api.example.com/api/ws-token', {
      method: 'GET',
      headers: {},
      credentials: 'include',
      body: undefined,
      signal: undefined,
    });
    expect(sockets).toEqual([{ url: 'wss://api.example.com/ws', protocols: ['ws-token-1'] }]);
  });
});
