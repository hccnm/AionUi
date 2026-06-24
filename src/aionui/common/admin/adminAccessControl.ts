import { fetchWithSaasAuth } from '../auth/http';
import { hasPermission, type Phase2CurrentUser } from '../auth/phase2';

export const ADMIN_USER_PERMISSION_FLAGS = [
  'admin:user:list',
  'admin:user:update',
  'admin:user:reset-password',
  'admin:user:assign-role',
] as const;

export const ADMIN_ROLE_PERMISSION_FLAGS = ['admin:role:list', 'admin:role:create', 'admin:role:update'] as const;

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  has_more?: boolean;
}

export interface AdminRole {
  id: string;
  role_key: string;
  role_name: string;
  description?: string | null;
  permissions: string[];
  status?: 'enabled' | 'disabled' | string;
  sort_order?: number;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  phone?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  status: 'enabled' | 'disabled' | string;
  roles: AdminRole[];
  external_identities?: Array<{
    provider: string;
    external_user_id: string;
    display_name?: string | null;
  }>;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
}

export interface ListAdminUsersParams {
  page?: number;
  page_size?: number;
  keyword?: string;
  status?: string;
}

export interface UpdateUserStatusInput {
  status: 'enabled' | 'disabled';
  reason?: string;
}

export interface ResetUserPasswordInput {
  password: string;
}

export interface AssignUserRolesInput {
  role_ids: string[];
  current_role_ids?: string[];
}

export interface AdminPermission {
  key: string;
  label: string;
  description?: string | null;
}

export interface UserSyncStatus {
  user_id: string;
  status: string;
  external_identities: AdminUser['external_identities'];
}

export interface RolePayload {
  role_key?: string;
  role_name: string;
  description?: string;
  status?: 'enabled' | 'disabled';
  permissions: string[];
  sort_order?: number;
  is_system?: boolean;
}

interface AdminEnvelope<T> {
  code?: 0 | string;
  message?: string;
  data?: T;
  trace_id?: string;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

interface AdapterOptions {
  fetcher?: Fetcher;
}

export class AdminApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly trace_id?: string;
  readonly details?: unknown;

  constructor(message: string, options: { status: number; code?: string; trace_id?: string; details?: unknown }) {
    super(message);
    this.name = 'AdminApiError';
    this.status = options.status;
    this.code = options.code;
    this.trace_id = options.trace_id;
    this.details = options.details;
  }
}

export class AdminForbiddenError extends AdminApiError {
  constructor(message: string, options: Omit<ConstructorParameters<typeof AdminApiError>[1], 'status'>) {
    super(message, { ...options, status: 403 });
    this.name = 'AdminForbiddenError';
  }
}

export class AdminConflictError extends AdminApiError {
  constructor(message: string, options: Omit<ConstructorParameters<typeof AdminApiError>[1], 'status'>) {
    super(message, { ...options, status: 409 });
    this.name = 'AdminConflictError';
  }
}

export class AdminValidationError extends AdminApiError {
  constructor(message: string, options: Omit<ConstructorParameters<typeof AdminApiError>[1], 'status'> & { status?: number }) {
    super(message, { ...options, status: options.status ?? 422 });
    this.name = 'AdminValidationError';
  }
}

function hasAnyFlag(currentUser: Phase2CurrentUser | null, flags: readonly string[]): boolean {
  return flags.some((flag) => hasPermission(currentUser, flag));
}

export function canViewAdminUsers(currentUser: Phase2CurrentUser | null): boolean {
  return Boolean(currentUser?.is_admin || currentUser?.derived?.can_manage_users || hasAnyFlag(currentUser, ADMIN_USER_PERMISSION_FLAGS));
}

export function canViewAdminRoles(currentUser: Phase2CurrentUser | null): boolean {
  return Boolean(currentUser?.is_admin || currentUser?.derived?.can_manage_roles || hasAnyFlag(currentUser, ADMIN_ROLE_PERMISSION_FLAGS));
}

export function canViewAnyAdmin(currentUser: Phase2CurrentUser | null): boolean {
  return canViewAdminUsers(currentUser) || canViewAdminRoles(currentUser);
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return response.json();
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as AdminEnvelope<T>).data as T;
  }
  return payload as T;
}

function toPaginatedResult<T>(value: T[] | PaginatedResult<T>): PaginatedResult<T> {
  if (Array.isArray(value)) {
    return {
      items: value,
      total: value.length,
      has_more: false,
    };
  }
  return value;
}

function createAdminError(response: Response, payload: unknown): Error {
  const envelope = payload && typeof payload === 'object' ? (payload as AdminEnvelope<unknown>) : {};
  const message = envelope.message ?? `Request failed with status ${response.status}`;
  const options = {
    code: typeof envelope.code === 'string' ? envelope.code : undefined,
    trace_id: envelope.trace_id,
    details: envelope.data,
  };

  if (response.status === 403) return new AdminForbiddenError(message, options);
  if (response.status === 409) return new AdminConflictError(message, options);
  if (response.status === 400 || response.status === 422) {
    return new AdminValidationError(message, { ...options, status: response.status });
  }
  return new AdminApiError(message, { ...options, status: response.status });
}

async function requestJson<T>(fetcher: Fetcher, input: string, init: RequestInit): Promise<T> {
  const response = await fetcher(input, init);
  const payload = await readJson(response);

  if (!response.ok) {
    throw createAdminError(response, payload);
  }

  return unwrapEnvelope<T>(payload);
}

function defaultFetcher(input: string, init?: RequestInit): Promise<Response> {
  return fetchWithSaasAuth(input, init, { auth: 'required' });
}

function jsonInit(method: string, body: unknown, signal?: AbortSignal): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  };
}

function getInit(signal?: AbortSignal): RequestInit {
  return { method: 'GET', headers: {}, signal };
}

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') continue;
    search.set(key, String(value));
  }
  const value = search.toString();
  return value ? `?${value}` : '';
}

export function createAdminAccessControlAdapter(options: AdapterOptions = {}) {
  const fetcher = options.fetcher ?? defaultFetcher;

  return {
    listUsers(params: ListAdminUsersParams = {}, signal?: AbortSignal) {
      return requestJson<AdminUser[] | PaginatedResult<AdminUser>>(
        fetcher,
        `/api/admin/users${queryString({
          page: params.page,
          page_size: params.page_size,
          keyword: params.keyword,
          status: params.status,
        })}`,
        getInit(signal)
      ).then(toPaginatedResult);
    },
    updateUserStatus(userId: string, input: UpdateUserStatusInput, signal?: AbortSignal) {
      return requestJson<AdminUser>(
        fetcher,
        `/api/admin/users/${encodeURIComponent(userId)}/status`,
        jsonInit('POST', { status: input.status }, signal)
      );
    },
    resetUserPassword(userId: string, input: ResetUserPasswordInput, signal?: AbortSignal) {
      return requestJson<AdminUser>(
        fetcher,
        `/api/admin/users/${encodeURIComponent(userId)}/reset-password`,
        jsonInit('POST', input, signal)
      );
    },
    assignUserRoles(userId: string, input: AssignUserRolesInput, signal?: AbortSignal) {
      const targetRoleIds = new Set(input.role_ids);
      const currentRoleIds = new Set(input.current_role_ids ?? []);
      const roleIdsToAdd = input.role_ids.filter((roleId) => !currentRoleIds.has(roleId));
      const roleIdsToRemove = [...currentRoleIds].filter((roleId) => !targetRoleIds.has(roleId));
      const addRequests = roleIdsToAdd.map((roleId) =>
        requestJson<AdminUser>(fetcher, `/api/admin/roles/${encodeURIComponent(roleId)}/users/${encodeURIComponent(userId)}`, {
          method: 'POST',
          headers: {},
          signal,
        })
      );
      const removeRequests = roleIdsToRemove.map((roleId) =>
        requestJson<AdminUser>(fetcher, `/api/admin/roles/${encodeURIComponent(roleId)}/users/${encodeURIComponent(userId)}`, {
          method: 'DELETE',
          headers: {},
          signal,
        })
      );
      return Promise.all([...addRequests, ...removeRequests]).then((items) => {
        const user = items.at(-1);
        if (!user) throw new Error('At least one role_id is required');
        return user;
      });
    },
    listRoles(signal?: AbortSignal) {
      return requestJson<AdminRole[] | PaginatedResult<AdminRole>>(fetcher, '/api/admin/roles', getInit(signal)).then(toPaginatedResult);
    },
    listPermissions(signal?: AbortSignal) {
      return requestJson<AdminPermission[]>(fetcher, '/api/admin/permissions', getInit(signal));
    },
    getUserSyncStatus(userId: string, signal?: AbortSignal) {
      return requestJson<UserSyncStatus>(fetcher, `/api/admin/users/${encodeURIComponent(userId)}/sync-status`, getInit(signal));
    },
    syncUserStatus(userId: string, signal?: AbortSignal) {
      return requestJson<UserSyncStatus>(fetcher, `/api/admin/users/${encodeURIComponent(userId)}/sync-status`, {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    createRole(input: RolePayload, signal?: AbortSignal) {
      return requestJson<AdminRole>(fetcher, '/api/admin/roles', jsonInit('POST', input, signal));
    },
    updateRole(roleId: string, input: RolePayload, signal?: AbortSignal) {
      return requestJson<AdminRole>(
        fetcher,
        `/api/admin/roles/${encodeURIComponent(roleId)}`,
        jsonInit('PATCH', input, signal)
      );
    },
    updateRoleStatus(roleId: string, input: UpdateUserStatusInput, signal?: AbortSignal) {
      return requestJson<AdminRole>(
        fetcher,
        `/api/admin/roles/${encodeURIComponent(roleId)}/status`,
        jsonInit('POST', { status: input.status }, signal)
      );
    },
    addUserRole(roleId: string, userId: string, signal?: AbortSignal) {
      return requestJson<AdminUser>(fetcher, `/api/admin/roles/${encodeURIComponent(roleId)}/users/${encodeURIComponent(userId)}`, {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    removeUserRole(roleId: string, userId: string, signal?: AbortSignal) {
      return requestJson<AdminUser>(fetcher, `/api/admin/roles/${encodeURIComponent(roleId)}/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {},
        signal,
      });
    },
  };
}

export const adminAccessControlAdapter = createAdminAccessControlAdapter();
