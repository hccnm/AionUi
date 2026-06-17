export interface AuthUser {
  id: string;
  username: string;
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

type PersistedAuthSession = {
  token: string | null;
  user: AuthUser | null;
  needsSetup: boolean;
};

export interface AuthSessionStore {
  getSnapshot: () => PersistedAuthSession;
  getToken: () => string | null;
  getUser: () => AuthUser | null;
  getNeedsSetup: () => boolean;
  setSession: (session: { token: string; user: AuthUser | null }) => void;
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
      needsSetup: false,
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedAuthSession>;
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      user:
        parsed.user &&
        typeof parsed.user === 'object' &&
        typeof parsed.user.id === 'string' &&
        typeof parsed.user.username === 'string'
          ? { id: parsed.user.id, username: parsed.user.username }
          : null,
      needsSetup: parsed.needsSetup === true,
    };
  } catch {
    return {
      token: null,
      user: null,
      needsSetup: false,
    };
  }
}

function writeSnapshot(storage: StorageLike, snapshot: PersistedAuthSession): void {
  storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
}

export function createAuthSessionStore(storage: StorageLike = getDefaultStorage()): AuthSessionStore {
  return {
    getSnapshot: () => readSnapshot(storage),
    getToken: () => readSnapshot(storage).token,
    getUser: () => readSnapshot(storage).user,
    getNeedsSetup: () => readSnapshot(storage).needsSetup,
    setSession: ({ token, user }) => {
      const current = readSnapshot(storage);
      writeSnapshot(storage, {
        ...current,
        token,
        user,
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
