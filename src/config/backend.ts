const DEFAULT_WS_PATH = '/ws';

export function getBackendBaseUrl(value = import.meta.env.VITE_AIONUI_BACKEND_BASE_URL ?? ''): string {
  return value.trim().replace(/\/+$/, '');
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
