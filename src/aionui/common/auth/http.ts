import { authSessionStore, type AuthSessionStore } from './session';
import { getBackendBaseUrl, resolveHttpUrl } from '@web/config/backend';

type SaasFetchOptions = {
  auth?: 'auto' | 'required' | 'none';
  retryOn401?: boolean;
  fetchImpl?: typeof fetch;
  sessionStore?: AuthSessionStore;
};

const PUBLIC_AUTH_PATHS = new Set([
  '/login',
  '/api/auth/status',
  '/api/auth/setup-password',
  '/api/auth/refresh',
  '/health',
  '/healthz',
]);

export const AUTH_EXPIRED_EVENT = 'aionweb:auth-expired';

function notifyAuthExpired(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
  }
}

function resolvePath(input: string | URL): string {
  return new URL(typeof input === 'string' ? input : input.toString(), 'http://aionweb.local').pathname;
}

function resolveRequestUrl(input: string | URL): string | URL {
  if (input instanceof URL) {
    return input;
  }
  if (/^https?:\/\//i.test(input)) {
    return input;
  }
  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return input;
  }
  return resolveHttpUrl(input, backendBaseUrl);
}

function resolveRefreshUrl(input: string | URL): string {
  const normalizedInput = resolveRequestUrl(input);
  if (normalizedInput instanceof URL || (typeof normalizedInput === 'string' && /^https?:\/\//i.test(normalizedInput))) {
    const url = new URL(typeof normalizedInput === 'string' ? normalizedInput : normalizedInput.toString());
    return `${url.origin}/api/auth/refresh`;
  }
  const backendBaseUrl = getBackendBaseUrl();
  return backendBaseUrl ? resolveHttpUrl('/api/auth/refresh', backendBaseUrl) : '/api/auth/refresh';
}

function shouldAttachAuth(input: string | URL, authMode: SaasFetchOptions['auth'] = 'auto'): boolean {
  if (authMode === 'none') return false;
  if (authMode === 'required') return true;
  return !PUBLIC_AUTH_PATHS.has(resolvePath(input));
}

async function parseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return response.json();
}

function extractToken(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.token === 'string') return record.token;
  if (record.data && typeof record.data === 'object' && typeof (record.data as Record<string, unknown>).token === 'string') {
    return (record.data as Record<string, unknown>).token as string;
  }
  return null;
}

export function expireAuthSession(sessionStore: AuthSessionStore = authSessionStore): void {
  sessionStore.clearSession();
  notifyAuthExpired();
}

export async function refreshAccessToken(options: {
  input: string | URL;
  fetchImpl?: typeof fetch;
  sessionStore?: AuthSessionStore;
}): Promise<string | null> {
  const sessionStore = options.sessionStore ?? authSessionStore;
  const fetcher = options.fetchImpl ?? fetch;
  const currentToken = sessionStore.getToken();
  if (!currentToken || sessionStore.getLoginMode() !== 'password') return null;

  const response = await fetcher(resolveRefreshUrl(options.input), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token: currentToken }),
    signal: undefined,
  });

  if (!response.ok) {
    expireAuthSession(sessionStore);
    return null;
  }

  const token = extractToken(await parseJson(response));
  if (!token) {
    expireAuthSession(sessionStore);
    return null;
  }

  sessionStore.setSession({
    token,
    user: sessionStore.getUser(),
  });
  return token;
}

export async function fetchWithSaasAuth(
  input: string | URL,
  init: RequestInit = {},
  options: SaasFetchOptions = {}
): Promise<Response> {
  const sessionStore = options.sessionStore ?? authSessionStore;
  const fetcher = options.fetchImpl ?? fetch;
  const retryOn401 = options.retryOn401 !== false;
  const authMode = options.auth ?? 'auto';
  const requestUrl = resolveRequestUrl(input);
  const headers = { ...((init.headers ?? {}) as Record<string, string>) };

  if (shouldAttachAuth(requestUrl, authMode)) {
    const token = sessionStore.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetcher(requestUrl, {
    ...init,
    headers,
    signal: init.signal,
  });

  if (!retryOn401 || response.status !== 401 || resolvePath(requestUrl) === '/api/auth/refresh') {
    return response;
  }

  const nextToken = await refreshAccessToken({
    input: requestUrl,
    fetchImpl: fetcher,
    sessionStore,
  });
  if (!nextToken) return response;

  const retryHeaders = { ...headers, Authorization: `Bearer ${nextToken}` };
  return fetcher(requestUrl, {
    ...init,
    headers: retryHeaders,
    signal: init.signal,
  });
}

export async function fetchJsonWithSaasAuth<T>(
  input: string | URL,
  init: RequestInit = {},
  options: SaasFetchOptions = {}
): Promise<T> {
  const response = await fetchWithSaasAuth(input, init, options);
  return (await parseJson(response)) as T;
}

export async function fetchWsToken(options: {
  url: string;
  fetchImpl?: typeof fetch;
  sessionStore?: AuthSessionStore;
}): Promise<string> {
  const payload = await fetchJsonWithSaasAuth<Record<string, unknown>>(
    options.url,
    {
      method: 'GET',
      headers: {},
    },
    {
      auth: 'required',
      fetchImpl: options.fetchImpl,
      sessionStore: options.sessionStore,
    }
  );
  const token =
    (typeof payload.ws_token === 'string' ? payload.ws_token : null) ??
    (payload.data && typeof payload.data === 'object' && typeof (payload.data as Record<string, unknown>).ws_token === 'string'
      ? ((payload.data as Record<string, unknown>).ws_token as string)
      : null) ??
    (typeof payload.token === 'string' ? payload.token : null);

  if (!token) {
    throw new Error('WebSocket token missing from backend response');
  }
  return token;
}
