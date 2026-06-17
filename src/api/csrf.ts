const DEFAULT_CSRF_COOKIE_NAME = 'aionui-csrf-token';
const DEFAULT_CSRF_HEADER_NAME = 'x-csrf-token';
const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function getBrowserCookie(): string {
  if (typeof document === 'undefined') return '';
  return document.cookie;
}

export function getCsrfTokenFromCookie(
  cookieString = getBrowserCookie(),
  cookieName = DEFAULT_CSRF_COOKIE_NAME
): string | undefined {
  const entries = cookieString
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean);

  for (const entry of entries) {
    const [rawName, ...rawValue] = entry.split('=');
    if (rawName === cookieName) return decodeURIComponent(rawValue.join('='));
  }
  return undefined;
}

export function isStateChangingMethod(method: string): boolean {
  return STATE_CHANGING_METHODS.has(method.toUpperCase());
}

export function buildHeaders(
  method: string,
  headers?: Record<string, string>,
  cookieString = getBrowserCookie()
): Record<string, string> {
  const nextHeaders: Record<string, string> = { ...(headers ?? {}) };
  if (!isStateChangingMethod(method)) return nextHeaders;

  const token = getCsrfTokenFromCookie(cookieString);
  if (token) nextHeaders[DEFAULT_CSRF_HEADER_NAME] = token;
  return nextHeaders;
}
