import { buildHeaders } from './csrf';
import { resolveHttpUrl } from '../config/backend';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  backendBaseUrl?: string;
  cookie?: string;
  fetchImpl?: typeof fetch;
};

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

async function readResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (contentType?.includes('application/json')) return response.json();
  return response.text();
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const hasBody = options.body !== undefined;
  const baseHeaders = hasBody ? { 'Content-Type': 'application/json', ...(options.headers ?? {}) } : options.headers;
  const headers = buildHeaders(method, baseHeaders, options.cookie);
  const fetcher = options.fetchImpl ?? fetch;
  const response = await fetcher(resolveHttpUrl(path, options.backendBaseUrl), {
    method,
    headers,
    credentials: 'include',
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new ApiError(response.status, response.statusText, await readResponseBody(response));
  }

  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return undefined as T;

  const json = (await response.json()) as unknown;
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data: T }).data;
  }
  return json as T;
}
