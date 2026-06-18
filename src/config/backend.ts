const DEFAULT_WS_PATH = '/ws';

function isWebUiBrowserRuntime(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }
  return !(window as Window & { __backendPort?: number }).__backendPort;
}

export function getBackendBaseUrl(value = import.meta.env.VITE_AIONUI_BACKEND_BASE_URL ?? ''): string {
  const normalized = value.trim().replace(/\/+$/, '');

  // In Vite dev, browser requests should go through the same-origin dev proxy
  // instead of hitting the configured backend origin directly. This removes
  // CORS preflight noise without affecting desktop or non-browser paths.
  if (normalized && import.meta.env.DEV && isWebUiBrowserRuntime()) {
    return '';
  }

  return normalized;
}

export function resolveHttpUrl(path: string, backendBaseUrl = getBackendBaseUrl()): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getBackendBaseUrl(backendBaseUrl);
  if (!base) return normalizedPath;
  return `${base}${normalizedPath}`;
}

export function resolveWsUrl(backendBaseUrl = getBackendBaseUrl(), path = DEFAULT_WS_PATH): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const base = getBackendBaseUrl(backendBaseUrl);

  if (!base) {
    if (typeof window === 'undefined') return normalizedPath;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}${normalizedPath}`;
  }

  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}${normalizedPath}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}
