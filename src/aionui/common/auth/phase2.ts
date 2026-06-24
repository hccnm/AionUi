import { fetchWithSaasAuth } from './http';

export type Phase2LoginMode = 'password' | 'gateway';

export interface Phase2AuthUser {
  id: string;
  phone?: string | null;
  username?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  status?: 'enabled' | 'disabled' | string;
  login_mode?: Phase2LoginMode;
}

export interface Phase2Role {
  id: string;
  role_key: string;
  role_name: string;
  permissions?: string[];
}

export interface Phase2AuthDerived {
  is_admin?: boolean;
  can_manage_users?: boolean;
  can_manage_roles?: boolean;
  [key: string]: boolean | undefined;
}

export interface Phase2CurrentUser extends Phase2AuthUser {
  roles: Phase2Role[];
  permission_flags: string[];
  is_admin?: boolean;
  derived?: Phase2AuthDerived;
}

export interface Phase2LoginResponse {
  token: string;
  expires_at?: string;
  user: Phase2AuthUser;
}

export interface Phase2RefreshResponse {
  token: string;
  expires_at?: string;
}

export interface Phase2Envelope<T> {
  code: 0 | number;
  message: string;
  data: T;
  trace_id?: string | null;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type FetchOptions = Parameters<typeof fetchWithSaasAuth>[2];

interface AdapterOptions {
  fetcher?: Fetcher;
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return response.json();
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as Phase2Envelope<T>).data;
  }
  return payload as T;
}

async function requestJson<T>(fetcher: Fetcher, input: string, init: RequestInit): Promise<T> {
  const response = await fetcher(input, init);
  const payload = await readJson(response);

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? String((payload as { message?: unknown }).message)
        : `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return unwrapEnvelope<T>(payload);
}

export function hasPermission(currentUser: Phase2CurrentUser | null, flag: string): boolean {
  if (!currentUser) return false;
  if (currentUser.permission_flags.includes('*') || currentUser.permission_flags.includes(flag)) return true;
  return currentUser.roles.some((role) => role.permissions?.includes('*') || role.permissions?.includes(flag));
}

export function hasAnyPermission(currentUser: Phase2CurrentUser | null, flags: string[]): boolean {
  return flags.some((flag) => hasPermission(currentUser, flag));
}

export function createPhase2AuthAdapter(options: AdapterOptions = {}) {
  const request = <T>(input: string, init: RequestInit, fetchOptions?: FetchOptions) => {
    const fetcher = options.fetcher ?? ((nextInput, nextInit) => fetchWithSaasAuth(nextInput, nextInit, fetchOptions));
    return requestJson<T>(fetcher, input, init);
  };

  return {
    login(username: string, password: string, signal?: AbortSignal) {
      return request<Phase2LoginResponse>(
        '/api/auth/login',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
          signal,
        },
        { auth: 'none', retryOn401: false }
      );
    },
    getMe(signal?: AbortSignal) {
      return request<Phase2CurrentUser>(
        '/api/auth/me',
        {
          method: 'GET',
          headers: {},
          signal,
        },
        { auth: 'required' }
      );
    },
    refresh(token: string) {
      return request<Phase2RefreshResponse>(
        '/api/auth/refresh',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        },
        { auth: 'none', retryOn401: false }
      );
    },
    logout(signal?: AbortSignal) {
      return request<void>(
        '/api/auth/logout',
        {
          method: 'POST',
          headers: {},
          signal,
        },
        { auth: 'required', retryOn401: false }
      );
    },
    changePassword(currentPassword: string, newPassword: string) {
      return request<void>(
        '/api/auth/change-password',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        },
        { auth: 'required' }
      );
    },
  };
}
