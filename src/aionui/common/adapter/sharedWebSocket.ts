import { authSessionStore } from '@/common/auth/session';
import { expireAuthSession, fetchWsToken as fetchAuthenticatedWsToken } from '@/common/auth/http';
import { getBackendBaseUrl, resolveHttpUrl, resolveWsUrl } from '@web/config/backend';

type SharedWsMessage = {
  name: string;
  data: unknown;
};

type SharedWsListener = (payload: unknown, eventName: string) => void;

declare global {
  interface Window {
    __backendPort?: number;
  }
}

const listeners = new Map<string, Set<SharedWsListener>>();
const anyListeners = new Set<SharedWsListener>();
const queue: SharedWsMessage[] = [];

let socket: WebSocket | null = null;
let connectPromise: Promise<void> | null = null;
let reconnectTimer: number | null = null;
let reconnectDelay = 500;
let shouldReconnect = true;

function getBackendPort(): number {
  if (typeof window !== 'undefined' && (window as Window).__backendPort) {
    return (window as Window).__backendPort as number;
  }
  const g = globalThis as typeof globalThis & { __backendPort?: number };
  return g.__backendPort ?? 13400;
}

function isWebUiBrowserMode(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && !(window as Window).__backendPort;
}

function getWsUrl(): string {
  const backendBaseUrl = getBackendBaseUrl();
  if (backendBaseUrl) {
    return resolveWsUrl(backendBaseUrl);
  }
  if (isWebUiBrowserMode()) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/ws`;
  }
  return `ws://127.0.0.1:${getBackendPort()}/ws`;
}

function getWsTokenUrl(): string {
  const backendBaseUrl = getBackendBaseUrl();
  if (backendBaseUrl) {
    return resolveHttpUrl('/api/ws-token', backendBaseUrl);
  }
  return getWsUrl().replace(/^ws:/, 'http:').replace(/^wss:/, 'https:').replace(/\/ws$/, '/api/ws-token');
}

function redirectToLoginIfNeeded() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname === '/login' || window.location.hash.includes('/login')) {
    return;
  }
  window.setTimeout(() => {
    window.location.hash = '/login';
  }, 300);
}

function handleAuthExpired() {
  shouldReconnect = false;
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  expireAuthSession(authSessionStore);
  redirectToLoginIfNeeded();
}

function emitToSubscribers(eventName: string, payload: unknown) {
  const matched = listeners.get(eventName);
  if (matched) {
    for (const listener of matched) {
      listener(payload, eventName);
    }
  }
  for (const listener of anyListeners) {
    listener(payload, eventName);
  }
}

function flushQueue() {
  if (!socket || socket.readyState !== WebSocket.OPEN) return;
  while (queue.length > 0) {
    const next = queue.shift();
    if (next) {
      socket.send(JSON.stringify(next));
    }
  }
}

function scheduleReconnect() {
  if (reconnectTimer !== null || !shouldReconnect) return;
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null;
    reconnectDelay = Math.min(reconnectDelay * 2, 8000);
    void connectSharedWebSocket();
  }, reconnectDelay);
}

export async function connectSharedWebSocket(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }
  if (connectPromise) {
    return connectPromise;
  }
  if (!authSessionStore.getToken()) {
    shouldReconnect = false;
    return;
  }

  connectPromise = (async () => {
    try {
      shouldReconnect = true;
      const wsToken = await fetchAuthenticatedWsToken({
        url: getWsTokenUrl(),
        sessionStore: authSessionStore,
      });
      socket = new WebSocket(getWsUrl(), [wsToken]);
    } catch {
      if (!authSessionStore.getToken()) {
        handleAuthExpired();
        return;
      }
      scheduleReconnect();
      return;
    }

    const currentSocket = socket;
    if (!currentSocket) {
      return;
    }

    currentSocket.addEventListener('open', () => {
      reconnectDelay = 500;
      flushQueue();
    });

    currentSocket.addEventListener('message', (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data as string) as {
          name?: string;
          event?: string;
          data?: unknown;
          payload?: unknown;
        };
        const eventName = payload.name ?? payload.event;
        const data = payload.data ?? payload.payload;
        if (!eventName) return;

        if (eventName === 'ping') {
          if (currentSocket.readyState === WebSocket.OPEN) {
            currentSocket.send(JSON.stringify({ name: 'pong', data: { timestamp: Date.now() } }));
          }
          return;
        }

        if (eventName === 'auth-expired' || eventName === 'realtime.auth-failed') {
          currentSocket.close(1008, 'auth-expired');
          handleAuthExpired();
          return;
        }

        emitToSubscribers(eventName, data);
      } catch {
        // ignore malformed payloads
      }
    });

    currentSocket.addEventListener('close', (event: CloseEvent) => {
      if (socket === currentSocket) {
        socket = null;
      }
      if (event.code === 1008) {
        handleAuthExpired();
        return;
      }
      scheduleReconnect();
    });

    currentSocket.addEventListener('error', () => {
      currentSocket.close();
    });
  })().finally(() => {
    connectPromise = null;
  });

  return connectPromise;
}

export function sendSharedWebSocketMessage(name: string, data: unknown) {
  const message = { name, data };
  if (!socket || socket.readyState === WebSocket.CLOSED || socket.readyState === WebSocket.CLOSING) {
    void connectSharedWebSocket();
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    try {
      socket.send(JSON.stringify(message));
      return;
    } catch {
      scheduleReconnect();
    }
  }

  queue.push(message);
}

export function subscribeSharedWebSocket(eventName: string, listener: SharedWsListener): () => void {
  void connectSharedWebSocket();
  if (!listeners.has(eventName)) {
    listeners.set(eventName, new Set());
  }
  listeners.get(eventName)!.add(listener);
  return () => {
    listeners.get(eventName)?.delete(listener);
  };
}

export function subscribeSharedWebSocketAll(listener: SharedWsListener): () => void {
  void connectSharedWebSocket();
  anyListeners.add(listener);
  return () => {
    anyListeners.delete(listener);
  };
}

export function reconnectSharedWebSocket() {
  shouldReconnect = true;
  reconnectDelay = 500;
  void connectSharedWebSocket();
}
