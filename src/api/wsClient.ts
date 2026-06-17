import { request } from './httpClient';
import { resolveWsUrl } from '../config/backend';

type WsTokenResponse = {
  token?: string;
};

type CreateAuthenticatedWebSocketOptions = {
  backendBaseUrl?: string;
  fetchImpl?: typeof fetch;
  WebSocketCtor?: typeof WebSocket;
};

export async function fetchWsToken(options: Pick<CreateAuthenticatedWebSocketOptions, 'backendBaseUrl' | 'fetchImpl'> = {}) {
  const response = await request<WsTokenResponse>('/api/ws-token', {
    method: 'GET',
    backendBaseUrl: options.backendBaseUrl,
    fetchImpl: options.fetchImpl,
  });
  if (!response.token) throw new Error('WebSocket token missing from backend response');
  return response.token;
}

export async function createAuthenticatedWebSocket(options: CreateAuthenticatedWebSocketOptions = {}): Promise<WebSocket> {
  const token = await fetchWsToken(options);
  const WebSocketImpl = options.WebSocketCtor ?? WebSocket;
  return new WebSocketImpl(resolveWsUrl(options.backendBaseUrl), [token]);
}
