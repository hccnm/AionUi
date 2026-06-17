import type { AuthSessionStore } from '../aionui/common/auth/session';
import { fetchWsToken as fetchSaasWsToken } from '../aionui/common/auth/http';
import { resolveWsUrl } from '../config/backend';

type CreateAuthenticatedWebSocketOptions = {
  backendBaseUrl?: string;
  fetchImpl?: typeof fetch;
  sessionStore?: AuthSessionStore;
  WebSocketCtor?: typeof WebSocket;
};

export async function fetchWsToken(
  options: Pick<CreateAuthenticatedWebSocketOptions, 'backendBaseUrl' | 'fetchImpl' | 'sessionStore'> = {}
) {
  const wsUrl = resolveWsUrl(options.backendBaseUrl);
  const httpUrl = wsUrl.replace(/^ws:/, 'http:').replace(/^wss:/, 'https:').replace(/\/ws$/, '/api/ws-token');
  return fetchSaasWsToken({
    url: httpUrl,
    fetchImpl: options.fetchImpl,
    sessionStore: options.sessionStore,
  });
}

export async function createAuthenticatedWebSocket(options: CreateAuthenticatedWebSocketOptions = {}): Promise<WebSocket> {
  const token = await fetchWsToken(options);
  const WebSocketImpl = options.WebSocketCtor ?? WebSocket;
  return new WebSocketImpl(resolveWsUrl(options.backendBaseUrl), [token]);
}
