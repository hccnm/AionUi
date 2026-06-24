import { describe, expect, it } from 'vitest';

import { createAuthSessionStore } from '../src/aionui/common/auth/session';

function createMemoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem(key: string) {
      return data.has(key) ? data.get(key)! : null;
    },
    setItem(key: string, value: string) {
      data.set(key, value);
    },
    removeItem(key: string) {
      data.delete(key);
    },
  };
}

describe('auth session store', () => {
  it('persists token, user, and setup flag in storage', () => {
    const storage = createMemoryStorage();
    const store = createAuthSessionStore(storage);

    store.setSession({
      token: 'token-1',
      user: { id: 'user-1', username: 'admin' },
    });
    store.setNeedsSetup(true);

    expect(store.getToken()).toBe('token-1');
    expect(store.getUser()).toEqual({ id: 'user-1', username: 'admin' });
    expect(store.getNeedsSetup()).toBe(true);
  });

  it('clears token, user, and setup flag together', () => {
    const storage = createMemoryStorage();
    const store = createAuthSessionStore(storage);

    store.setSession({
      token: 'token-1',
      user: { id: 'user-1', username: 'admin' },
    });
    store.setNeedsSetup(true);
    store.clearSession();

    expect(store.getToken()).toBeNull();
    expect(store.getUser()).toBeNull();
    expect(store.getNeedsSetup()).toBe(false);
  });

  it('persists phase2 current user and login mode', () => {
    const storage = createMemoryStorage();
    const store = createAuthSessionStore(storage);
    const currentUser = {
      id: 'usr_1',
      phone: '13800138000',
      username: 'zhangsan',
      display_name: '张三',
      roles: [{ id: 'role_admin', role_key: 'super_admin', role_name: '超级管理员', permissions: ['*'] }],
      permission_flags: ['*'],
      is_admin: true,
    };

    store.setSession({ token: 'token-1', currentUser, loginMode: 'password' });

    expect(store.getToken()).toBe('token-1');
    expect(store.getCurrentUser()).toEqual(currentUser);
    expect(store.getLoginMode()).toBe('password');
  });
});
