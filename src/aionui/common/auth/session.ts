import type { Phase2CurrentUser, Phase2LoginMode } from './phase2';

export interface AuthUser {
  id: string;
  username: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type PersistedAuthSession = {
  token: string | null;
  user: AuthUser | null;
  currentUser: Phase2CurrentUser | null;
  loginMode: Phase2LoginMode | null;
  needsSetup: boolean;
};

export interface AuthSessionStore {
  getSnapshot: () => PersistedAuthSession;
  getToken: () => string | null;
  getUser: () => AuthUser | null;
  getCurrentUser: () => Phase2CurrentUser | null;
  getLoginMode: () => Phase2LoginMode | null;
  getNeedsSetup: () => boolean;
  setSession: (
    session:
      | { token: string | null; user: AuthUser | null; currentUser?: never; loginMode?: never }
      | { token: string | null; currentUser: Phase2CurrentUser | null; loginMode: Phase2LoginMode | null; user?: AuthUser | null }
  ) => void;
  setNeedsSetup: (needsSetup: boolean) => void;
  clearSession: () => void;
}

const AUTH_SESSION_STORAGE_KEY = 'aionweb.auth.session';

function createMemoryStorage(): StorageLike {
  const state = new Map<string, string>();
  return {
    getItem(key) {
      return state.has(key) ? state.get(key)! : null;
    },
    setItem(key, value) {
      state.set(key, value);
    },
    removeItem(key) {
      state.delete(key);
    },
  };
}

function getDefaultStorage(): StorageLike {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return createMemoryStorage();
}

function readSnapshot(storage: StorageLike): PersistedAuthSession {
  const raw = storage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!raw) {
    return {
      token: null,
      user: null,
      currentUser: null,
      loginMode: null,
      needsSetup: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAuthSession>;
    const currentUser =
      parsed.currentUser &&
      typeof parsed.currentUser === 'object' &&
      typeof parsed.currentUser.id === 'string'
        ? (parsed.currentUser as Phase2CurrentUser)
        : null;
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      user:
        parsed.user &&
        typeof parsed.user === 'object' &&
        typeof parsed.user.id === 'string' &&
        typeof parsed.user.username === 'string'
          ? { id: parsed.user.id, username: parsed.user.username }
          : null,
      currentUser,
      loginMode: parsed.loginMode === 'password' || parsed.loginMode === 'gateway' ? parsed.loginMode : null,
      needsSetup: parsed.needsSetup === true,
    };
  } catch {
    return {
      token: null,
      user: null,
      currentUser: null,
      loginMode: null,
      needsSetup: false,
    };
  }
}

function writeSnapshot(storage: StorageLike, snapshot: PersistedAuthSession): void {
  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
}

function toAuthUser(currentUser: Phase2CurrentUser): AuthUser {
  return {
    id: currentUser.id,
    username: currentUser.display_name || currentUser.username || currentUser.phone || currentUser.id,
  };
}

export function createAuthSessionStore(storage: StorageLike = getDefaultStorage()): AuthSessionStore {
  return {
    getSnapshot: () => readSnapshot(storage),
    getToken: () => readSnapshot(storage).token,
    getUser: () => {
      const snapshot = readSnapshot(storage);
      if (snapshot.currentUser) {
        return toAuthUser(snapshot.currentUser);
      }
      return snapshot.user;
    },
    getCurrentUser: () => readSnapshot(storage).currentUser,
    getLoginMode: () => readSnapshot(storage).loginMode,
    getNeedsSetup: () => readSnapshot(storage).needsSetup,
    setSession: (session) => {
      const current = readSnapshot(storage);
      const currentUser = 'currentUser' in session ? session.currentUser : current.currentUser;
      const user =
        'currentUser' in session
          ? session.user ??
            (session.currentUser ? toAuthUser(session.currentUser) : null)
          : session.user;
      writeSnapshot(storage, {
        ...current,
        token: session.token,
        user,
        currentUser,
        loginMode: 'loginMode' in session ? session.loginMode : current.loginMode,
      });
    },
    setNeedsSetup: (needsSetup) => {
      const current = readSnapshot(storage);
      writeSnapshot(storage, {
        ...current,
        needsSetup,
      });
    },
    clearSession: () => {
      storage.removeItem(AUTH_SESSION_STORAGE_KEY);
    },
  };
}

export const authSessionStore = createAuthSessionStore();
