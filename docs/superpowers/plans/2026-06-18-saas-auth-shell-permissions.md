---
change: saas-auth-shell-permissions
design-doc: docs/superpowers/specs/2026-06-18-saas-auth-shell-permissions-design.md
base-ref: f0509e8e856cd855c909a9c899893e7ccd775854
---

# SaaS 认证与权限应用壳实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** 将二阶段 SaaS 前端认证主流程切换到 `GET /api/auth/me` 和 phase2 auth adapter，并支持 password/gateway 两种模式。

**Architecture:** 新增 `src/aionui/common/auth/phase2.ts` 作为认证契约与 API adapter。扩展 `session.ts` 持久化完整 current-user payload、login mode 和 token；调整 `http.ts` 只在 password mode refresh；重构 `AuthContext` 消费 adapter 并暴露权限 helper。

**Tech Stack:** TypeScript, React 19, Vitest, existing `fetchWithSaasAuth`, existing localStorage-backed session store.

## Global Constraints

- SaaS 前端业务登录态、当前用户和权限只以 `GET /api/auth/me` 为准。
- `/api/auth/status` 只能作为兼容或探测接口，不参与 SaaS 菜单、路由或登录态判断。
- Password 模式保存 Aion JWT，refresh 只服务 Aion JWT。
- Gateway 模式不保存 Aion JWT，不调用 refresh，不构造 `X-Gateway-*` header。
- `permission_flags` 是长期权限契约，`derived` 是稳定便捷字段。
- Password logout 使用 `POST /api/auth/logout`；gateway logout URL 来自部署配置，未配置时只清前端状态并回登录页。

---

## File Structure

- Create: `src/aionui/common/auth/phase2.ts`
  负责二阶段 auth 类型、envelope 解析、adapter API、权限 helper。
- Modify: `src/aionui/common/auth/session.ts`
  扩展 session store，保存完整 current-user payload、login mode、token，并兼容旧存储。
- Modify: `src/aionui/common/auth/http.ts`
  基于 session login mode 决定 attach token 和 refresh，保留 `fetchWithSaasAuth` 对外接口。
- Modify: `src/aionui/renderer/hooks/context/AuthContext.tsx`
  改为消费 phase2 adapter，移除 SaaS 主流程对 `/api/auth/status` 和 `/api/auth/user` 的依赖。
- Modify: `src/aionui/renderer/pages/login/index.tsx`
  表单语义从 username/password 收敛为 phone/password；setup-password 只保留 legacy 分支时可触发。
- Test: `tests/authSession.test.ts`
  覆盖新 session shape 和旧数据降级。
- Test: `tests/authPhase2.test.ts`
  覆盖 adapter、envelope、权限 helper。
- Test: `tests/httpClient.test.ts`
  覆盖 password refresh 与 gateway 不 refresh。

### Task 1: Phase2 Auth Contract And Adapter

**Files:**
- Create: `src/aionui/common/auth/phase2.ts`
- Test: `tests/authPhase2.test.ts`

**Interfaces:**
- Produces: `Phase2AuthUser`, `Phase2CurrentUser`, `Phase2LoginMode`, `Phase2AuthSession`, `createPhase2AuthAdapter`, `hasPermission`, `hasAnyPermission`
- Consumes: `fetchWithSaasAuth` only through injected `fetcher` or default fetch for testability

- [x] **Step 1: Write failing tests for envelope parsing and permission helpers**

Add `tests/authPhase2.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';

import { createPhase2AuthAdapter, hasAnyPermission, hasPermission } from '../src/aionui/common/auth/phase2';

const currentUser = {
  user: {
    id: 'usr_1',
    phone: '13800138000',
    display_name: '张三',
    avatar_url: null,
    status: 'enabled',
    login_mode: 'password',
  },
  roles: [{ id: 'role_admin', role_key: 'admin', role_name: '管理员' }],
  permission_flags: ['admin:user:list'],
  derived: { is_admin: true, can_manage_users: true, can_manage_roles: false },
};

describe('phase2 auth adapter', () => {
  it('unwraps /api/auth/me envelope', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: 'ok', data: currentUser, trace_id: 'tr_1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    const adapter = createPhase2AuthAdapter({ fetcher });

    await expect(adapter.getMe()).resolves.toEqual(currentUser);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/me', {
      method: 'GET',
      headers: {},
      signal: undefined,
    });
  });

  it('checks permission flags without reading roles', () => {
    expect(hasPermission(currentUser, 'admin:user:list')).toBe(true);
    expect(hasPermission(currentUser, 'admin:role:list')).toBe(false);
    expect(hasAnyPermission(currentUser, ['admin:role:list', 'admin:user:list'])).toBe(true);
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/authPhase2.test.ts`

Expected: FAIL because `src/aionui/common/auth/phase2.ts` does not exist.

- [x] **Step 3: Create phase2 adapter and types**

Create `src/aionui/common/auth/phase2.ts`:

```ts
export type Phase2LoginMode = 'password' | 'gateway';

export interface Phase2AuthUser {
  id: string;
  phone: string;
  display_name: string;
  avatar_url: string | null;
  status: 'enabled' | 'disabled' | string;
  login_mode: Phase2LoginMode;
}

export interface Phase2Role {
  id: string;
  role_key: string;
  role_name: string;
}

export interface Phase2AuthDerived {
  is_admin?: boolean;
  can_manage_users?: boolean;
  can_manage_roles?: boolean;
  [key: string]: boolean | undefined;
}

export interface Phase2CurrentUser {
  user: Phase2AuthUser;
  roles: Phase2Role[];
  permission_flags: string[];
  derived: Phase2AuthDerived;
}

export interface Phase2LoginResponse {
  token: string;
  expires_at: string;
  user: Phase2AuthUser;
}

export interface Phase2RefreshResponse {
  token: string;
  expires_at: string;
}

export interface Phase2Envelope<T> {
  code: 0 | string;
  message: string;
  data: T;
  trace_id?: string;
}

type AdapterOptions = {
  fetcher?: typeof fetch;
};

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return (await response.json()) as T;
}

function unwrapEnvelope<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    const envelope = payload as Phase2Envelope<T>;
    return envelope.data;
  }
  return payload as T;
}

async function requestJson<T>(fetcher: typeof fetch, input: string, init: RequestInit): Promise<T> {
  const response = await fetcher(input, init);
  const payload = await readJson<unknown>(response);
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
  return currentUser?.permission_flags.includes(flag) ?? false;
}

export function hasAnyPermission(currentUser: Phase2CurrentUser | null, flags: string[]): boolean {
  return flags.some((flag) => hasPermission(currentUser, flag));
}

export function createPhase2AuthAdapter(options: AdapterOptions = {}) {
  const fetcher = options.fetcher ?? fetch;
  return {
    login(phone: string, password: string, signal?: AbortSignal) {
      return requestJson<Phase2LoginResponse>(fetcher, '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password }),
        signal,
      });
    },
    getMe(signal?: AbortSignal) {
      return requestJson<Phase2CurrentUser>(fetcher, '/api/auth/me', {
        method: 'GET',
        headers: {},
        signal,
      });
    },
    refresh(token: string) {
      return requestJson<Phase2RefreshResponse>(fetcher, '/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    },
    logout(signal?: AbortSignal) {
      return requestJson<void>(fetcher, '/api/auth/logout', {
        method: 'POST',
        headers: {},
        signal,
      });
    },
    changePassword(currentPassword: string, newPassword: string) {
      return requestJson<void>(fetcher, '/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
    },
  };
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/authPhase2.test.ts`

Expected: PASS.

- [x] **Step 5: Commit task**

```bash
git add src/aionui/common/auth/phase2.ts tests/authPhase2.test.ts
git commit -m "feat: add phase2 auth contract adapter"
```

### Task 2: Session Store Shape

**Files:**
- Modify: `src/aionui/common/auth/session.ts`
- Modify: `tests/authSession.test.ts`

**Interfaces:**
- Consumes: `Phase2CurrentUser`, `Phase2LoginMode`
- Produces: `getCurrentUser()`, `getLoginMode()`, `setSession({ token, currentUser, loginMode })`

- [x] **Step 1: Write failing session tests**

Extend `tests/authSession.test.ts`:

```ts
it('persists phase2 current user and login mode', () => {
  const storage = createMemoryStorage();
  const store = createAuthSessionStore(storage);
  const currentUser = {
    user: {
      id: 'usr_1',
      phone: '13800138000',
      display_name: '张三',
      avatar_url: null,
      status: 'enabled',
      login_mode: 'password' as const,
    },
    roles: [{ id: 'role_admin', role_key: 'admin', role_name: '管理员' }],
    permission_flags: ['admin:user:list'],
    derived: { is_admin: true, can_manage_users: true },
  };

  store.setSession({ token: 'token-1', currentUser, loginMode: 'password' });

  expect(store.getToken()).toBe('token-1');
  expect(store.getCurrentUser()).toEqual(currentUser);
  expect(store.getLoginMode()).toBe('password');
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/authSession.test.ts`

Expected: FAIL because session store does not expose phase2 methods.

- [x] **Step 3: Extend session store while preserving legacy user compatibility**

Modify `src/aionui/common/auth/session.ts` to import phase2 types and store both legacy `user` and phase2 `currentUser` during migration:

```ts
import type { Phase2CurrentUser, Phase2LoginMode } from './phase2';

export type AuthUser = Phase2CurrentUser['user'] & { username?: string };

type PersistedAuthSession = {
  token: string | null;
  user: AuthUser | null;
  currentUser: Phase2CurrentUser | null;
  loginMode: Phase2LoginMode | null;
  needsSetup: boolean;
};
```

Update `AuthSessionStore` with:

```ts
getCurrentUser: () => Phase2CurrentUser | null;
getLoginMode: () => Phase2LoginMode | null;
setSession: (session: { token: string | null; currentUser: Phase2CurrentUser | null; loginMode: Phase2LoginMode | null }) => void;
```

Keep `getUser()` by deriving from `currentUser?.user ?? legacy user`, so existing consumers continue compiling during the migration.

- [x] **Step 4: Run tests**

Run: `npm test -- tests/authSession.test.ts tests/wsClient.test.ts`

Expected: PASS.

- [x] **Step 5: Commit task**

```bash
git add src/aionui/common/auth/session.ts tests/authSession.test.ts tests/wsClient.test.ts
git commit -m "feat: persist phase2 auth session state"
```

### Task 3: HTTP Auth Refresh Rules

**Files:**
- Modify: `src/aionui/common/auth/http.ts`
- Modify: `tests/httpClient.test.ts`

**Interfaces:**
- Consumes: `AuthSessionStore.getLoginMode()`
- Produces: refresh only when `loginMode === "password"` and token exists

- [x] **Step 1: Write failing gateway test**

Add to `tests/httpClient.test.ts`:

```ts
it('does not refresh gateway sessions on 401', async () => {
  const store = createAuthSessionStore(createMemoryStorage());
  store.setSession({ token: null, currentUser: null, loginMode: 'gateway' });
  const fetchSpy = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ code: 'UNAUTHENTICATED', message: 'expired' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  );
  vi.stubGlobal('fetch', fetchSpy);

  await request('/api/conversations', {
    method: 'GET',
    backendBaseUrl: 'https://api.example.com',
    sessionStore: store,
  });

  expect(fetchSpy).toHaveBeenCalledTimes(1);
  expect(fetchSpy).toHaveBeenCalledWith('https://api.example.com/api/conversations', {
    method: 'GET',
    headers: {},
    body: undefined,
    signal: undefined,
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/httpClient.test.ts`

Expected: FAIL until `setSession` signature and HTTP refresh behavior are updated.

- [x] **Step 3: Update refresh rule**

In `src/aionui/common/auth/http.ts`, change `refreshAccessToken` to return `null` unless session login mode is `password`:

```ts
const currentToken = sessionStore.getToken();
if (!currentToken || sessionStore.getLoginMode() !== 'password') return null;
```

In `fetchWithSaasAuth`, keep bearer attachment conditional on token existing. Do not add any gateway-specific headers.

- [x] **Step 4: Update existing tests to new session shape**

Replace old test setup:

```ts
store.setSession({
  token: 'token-1',
  user: { id: 'user-1', username: 'admin' },
});
```

with password-mode phase2 setup:

```ts
store.setSession({ token: 'token-1', currentUser: null, loginMode: 'password' });
```

- [x] **Step 5: Run tests**

Run: `npm test -- tests/httpClient.test.ts tests/wsClient.test.ts`

Expected: PASS.

- [x] **Step 6: Commit task**

```bash
git add src/aionui/common/auth/http.ts tests/httpClient.test.ts tests/wsClient.test.ts
git commit -m "feat: scope auth refresh to password sessions"
```

### Task 4: AuthContext And Login Flow

**Files:**
- Modify: `src/aionui/renderer/hooks/context/AuthContext.tsx`
- Modify: `src/aionui/renderer/pages/login/index.tsx`
- Optional Modify: `src/aionui/renderer/components/layout/Router.tsx`

**Interfaces:**
- Consumes: `createPhase2AuthAdapter`, `AuthSessionStore`
- Produces: `useAuth()` with `currentUser`, `permissionFlags`, `derived`, `hasPermission`, `hasAnyPermission`

- [x] **Step 1: Refactor AuthContext state**

Replace legacy `fetchAuthStatus` and `fetchCurrentUser('/api/auth/user')` startup logic with adapter `getMe()`. Keep `AuthStatus = 'checking' | 'authenticated' | 'unauthenticated'`; remove SaaS dependency on `setup_required`.

Expose:

```ts
interface AuthContextValue {
  ready: boolean;
  user: Phase2AuthUser | null;
  currentUser: Phase2CurrentUser | null;
  status: AuthStatus;
  login: (params: LoginParams) => Promise<LoginResult>;
  changePassword: (params: ChangePasswordParams) => Promise<SetupPasswordResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearAuthCache: () => void;
  hasPermission: (flag: string) => boolean;
  hasAnyPermission: (flags: string[]) => boolean;
}
```

- [x] **Step 2: Update login flow**

Change `LoginParams` from `username` to `phone`:

```ts
interface LoginParams {
  phone: string;
  password: string;
  remember?: boolean;
}
```

`login` should call `adapter.login(phone, password)`, persist token with `loginMode: 'password'`, then call `adapter.getMe()` and store current-user payload.

- [x] **Step 3: Update logout flow**

Password mode calls `adapter.logout()`. Gateway mode does not call Aion logout; it clears local state and optionally redirects to configured gateway logout URL if a config key is available during implementation.

- [x] **Step 4: Update login page naming**

In `src/aionui/renderer/pages/login/index.tsx`, keep UI layout but rename internal state from `username` to `phone` where possible. Submit:

```ts
const result = await login({ phone: trimmedPhone, password, remember: rememberMe });
```

If translation keys still say username, defer copy cleanup to the implementation pass only if it is in the touched locale file scope.

- [x] **Step 5: Run typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 6: Commit task**

```bash
git add src/aionui/renderer/hooks/context/AuthContext.tsx src/aionui/renderer/pages/login/index.tsx
git commit -m "feat: migrate auth context to phase2 current user"
```

### Task 5: Permission Shell And Verification

**Files:**
- Modify: `src/aionui/renderer/components/layout/Sider/index.tsx`
- Modify: `src/aionui/renderer/components/layout/Router.tsx`
- Modify: `openspec/changes/saas-auth-shell-permissions/tasks.md`

**Interfaces:**
- Consumes: `useAuth().hasPermission`, `useAuth().currentUser`, `useAuth().status`
- Produces: auth shell no longer uses `/api/auth/status` for SaaS route/menu decisions

- [x] **Step 1: Route guard verification**

Confirm `ProtectedLayout` only gates on `status === 'authenticated'`. Do not add status probe or setup-required branch for SaaS.

- [x] **Step 2: Permission helper integration**

If this change adds any auth-dependent menu entries, use `hasPermission` or `hasAnyPermission`. For existing shell, add no speculative admin entries here; admin entries belong to `admin-user-role-management`.

- [x] **Step 3: Mark OpenSpec tasks done as implementation completes**

After implementation and tests pass, update `openspec/changes/saas-auth-shell-permissions/tasks.md` by checking completed boxes that correspond to implemented work.

- [x] **Step 4: Run full validation commands**

Run:

```bash
npm test -- tests/authSession.test.ts tests/authPhase2.test.ts tests/httpClient.test.ts tests/wsClient.test.ts
npm run typecheck
```

Expected: all commands PASS.

- [x] **Step 5: Commit task**

```bash
git add src/aionui/renderer/components/layout/Sider/index.tsx src/aionui/renderer/components/layout/Router.tsx openspec/changes/saas-auth-shell-permissions/tasks.md
git commit -m "feat: wire phase2 auth permissions into shell"
```

## Self-Review

- Spec coverage: The plan covers current-user authority, status downgrade, password JWT, gateway delegation, permission contract, change-password, and route/menu shell behavior.
- Placeholder scan: No task contains unresolved marker words or incomplete implementation notes.
- Type consistency: `Phase2CurrentUser`, `Phase2LoginMode`, `createPhase2AuthAdapter`, `hasPermission`, and `hasAnyPermission` are defined in Task 1 before later tasks consume them.
