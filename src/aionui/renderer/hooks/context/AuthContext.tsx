import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { authSessionStore, type AuthUser } from '@/common/auth/session';
import { AUTH_EXPIRED_EVENT, fetchWithSaasAuth } from '@/common/auth/http';

type AuthStatus = 'checking' | 'setup_required' | 'authenticated' | 'unauthenticated';

interface LoginParams {
  username: string;
  password: string;
  remember?: boolean;
}

type LoginErrorCode = 'invalidCredentials' | 'tooManyAttempts' | 'serverError' | 'networkError' | 'unknown';

interface LoginResult {
  success: boolean;
  message?: string;
  code?: LoginErrorCode;
}

interface SetupPasswordResult {
  success: boolean;
  message?: string;
}

interface ChangePasswordParams {
  currentPassword: string;
  newPassword: string;
}

interface AuthContextValue {
  ready: boolean;
  user: AuthUser | null;
  status: AuthStatus;
  login: (params: LoginParams) => Promise<LoginResult>;
  setupPassword: (newPassword: string) => Promise<SetupPasswordResult>;
  changePassword: (params: ChangePasswordParams) => Promise<SetupPasswordResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearAuthCache: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type AuthStatusResponse = {
  success: boolean;
  needs_setup: boolean;
  user_count: number;
  is_authenticated: boolean;
};

type AuthUserResponse = {
  success: boolean;
  user?: AuthUser;
};

type LoginResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: AuthUser;
  error?: string;
  code?: string;
};

function clearAuthCache(): void {
  authSessionStore.clearSession();
}

async function readJson<T>(response: Response): Promise<T | null> {
  const contentType = response.headers.get('Content-Type');
  if (!contentType?.includes('application/json')) return null;
  return (await response.json()) as T;
}

async function fetchAuthStatus(signal?: AbortSignal): Promise<AuthStatusResponse | null> {
  try {
    const response = await fetchWithSaasAuth(
      '/api/auth/status',
      {
        method: 'GET',
        headers: {},
        signal,
      },
      {
        auth: 'none',
        retryOn401: false,
      }
    );
    if (!response.ok) return null;
    return readJson<AuthStatusResponse>(response);
  } catch (error) {
    if ((error as Error).name === 'AbortError') return null;
    console.error('Failed to fetch auth status:', error);
    return null;
  }
}

async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  try {
    const response = await fetchWithSaasAuth(
      '/api/auth/user',
      {
        method: 'GET',
        headers: {},
        signal,
      },
      {
        auth: 'required',
      }
    );

    if (!response.ok) return null;

    const data = await readJson<AuthUserResponse>(response);
    if (data?.success && data.user) {
      return data.user;
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return null;
    }
    console.error('Failed to fetch current user:', error);
  }

  return null;
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(authSessionStore.getUser());
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('checking');

    const authStatus = await fetchAuthStatus(controller.signal);
    if (!authStatus) {
      setUser(authSessionStore.getUser());
      setStatus(authSessionStore.getNeedsSetup() ? 'setup_required' : 'unauthenticated');
      setReady(true);
      return;
    }

    if (authStatus.needs_setup) {
      authSessionStore.clearSession();
      authSessionStore.setNeedsSetup(true);
      setUser(null);
      setStatus('setup_required');
      setReady(true);
      return;
    }

    authSessionStore.setNeedsSetup(false);

    const token = authSessionStore.getToken();
    if (!token) {
      setUser(null);
      setStatus('unauthenticated');
      setReady(true);
      return;
    }

    const currentUser = await fetchCurrentUser(controller.signal);
    if (currentUser) {
      authSessionStore.setSession({
        token,
        user: currentUser,
      });
      setUser(currentUser);
      setStatus('authenticated');
    } else {
      authSessionStore.clearSession();
      setUser(null);
      setStatus('unauthenticated');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    const handleAuthExpired = () => {
      abortRef.current?.abort();
      setUser(null);
      setStatus(authSessionStore.getNeedsSetup() ? 'setup_required' : 'unauthenticated');
      setReady(true);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  const login = useCallback(async ({ username, password }: LoginParams): Promise<LoginResult> => {
    try {
      const response = await fetchWithSaasAuth(
        '/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ username, password }),
        },
        {
          auth: 'none',
          retryOn401: false,
        }
      );
      const data = (await readJson<LoginResponse>(response)) ?? { success: false };

      if (!response.ok || !data.success || !data.user || !data.token) {
        let code: LoginErrorCode = 'unknown';
        if (response.status === 401) {
          code = 'invalidCredentials';
        } else if (response.status === 429) {
          code = 'tooManyAttempts';
        } else if (response.status >= 500) {
          code = 'serverError';
        }
        return {
          success: false,
          message: data.error ?? data.message ?? 'Login failed',
          code,
        };
      }

      authSessionStore.setNeedsSetup(false);
      authSessionStore.setSession({
        token: data.token,
        user: data.user,
      });
      setUser(data.user);
      setStatus('authenticated');
      setReady(true);

      const win = window as Window & { __websocketReconnect?: () => void };
      if (typeof window !== 'undefined' && win.__websocketReconnect) {
        win.__websocketReconnect();
      }

      return { success: true };
    } catch (error) {
      console.error('Login request failed:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
        code: 'networkError',
      };
    }
  }, []);

  const setupPassword = useCallback(async (newPassword: string): Promise<SetupPasswordResult> => {
    try {
      const response = await fetchWithSaasAuth(
        '/api/auth/setup-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ new_password: newPassword }),
        },
        {
          auth: 'none',
          retryOn401: false,
        }
      );

      const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
      if (!response.ok) {
        return {
          success: false,
          message: data?.error ?? data?.message ?? 'Failed to set password',
        };
      }

      authSessionStore.setNeedsSetup(false);
      setStatus('unauthenticated');
      setReady(true);
      return {
        success: true,
        message: data?.message,
      };
    } catch (error) {
      console.error('Setup password request failed:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }, []);

  const changePassword = useCallback(async ({ currentPassword, newPassword }: ChangePasswordParams) => {
    try {
      const response = await fetchWithSaasAuth(
        '/api/auth/change-password',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            current_password: currentPassword,
            new_password: newPassword,
          }),
        },
        {
          auth: 'required',
        }
      );
      const data = await readJson<{ success?: boolean; error?: string; message?: string }>(response);
      if (!response.ok) {
        return {
          success: false,
          message: data?.error ?? data?.message ?? 'Failed to change password',
        };
      }
      return {
        success: true,
        message: data?.message,
      };
    } catch (error) {
      console.error('Change password request failed:', error);
      return {
        success: false,
        message: 'Network error. Please try again.',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetchWithSaasAuth(
        '/logout',
        {
          method: 'POST',
          headers: {},
        },
        {
          auth: 'required',
          retryOn401: false,
        }
      );
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      authSessionStore.clearSession();
      setUser(null);
      setStatus('unauthenticated');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      status,
      login,
      setupPassword,
      changePassword,
      logout,
      refresh,
      clearAuthCache,
    }),
    [changePassword, login, logout, ready, refresh, setupPassword, status, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
