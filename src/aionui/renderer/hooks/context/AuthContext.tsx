import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import {
  createPhase2AuthAdapter,
  hasAnyPermission as phase2HasAnyPermission,
  hasPermission as phase2HasPermission,
  type Phase2CurrentUser,
  type Phase2LoginMode,
} from '@/common/auth/phase2';
import { authSessionStore, type AuthUser } from '@/common/auth/session';
import { AUTH_EXPIRED_EVENT } from '@/common/auth/http';

type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

interface LoginParams {
  phone: string;
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
  currentUser: Phase2CurrentUser | null;
  permissionFlags: string[];
  derived: NonNullable<Phase2CurrentUser['derived']> | null;
  status: AuthStatus;
  login: (params: LoginParams) => Promise<LoginResult>;
  changePassword: (params: ChangePasswordParams) => Promise<SetupPasswordResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearAuthCache: () => void;
  hasPermission: (flag: string) => boolean;
  hasAnyPermission: (flags: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const authAdapter = createPhase2AuthAdapter();

function clearAuthCache(): void {
  authSessionStore.clearSession();
}

function toLegacyUser(user: Phase2CurrentUser): AuthUser {
  return {
    id: user.id,
    username: user.display_name || user.username || user.phone || user.id,
  };
}

function inferLoginMode(currentUser: Phase2CurrentUser | null): Phase2LoginMode | null {
  return currentUser?.login_mode ?? authSessionStore.getLoginMode();
}

function getGatewayLogoutUrl(): string | null {
  const value = import.meta.env.VITE_AIONUI_GATEWAY_LOGOUT_URL;
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function mapLoginError(error: unknown): LoginResult {
  const message = error instanceof Error ? error.message : 'Login failed';
  return {
    success: false,
    message,
    code: message.toLowerCase().includes('credential') ? 'invalidCredentials' : 'unknown',
  };
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<Phase2CurrentUser | null>(authSessionStore.getCurrentUser());
  const [user, setUser] = useState<AuthUser | null>(authSessionStore.getUser());
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [ready, setReady] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const applyAuthenticatedUser = useCallback((nextCurrentUser: Phase2CurrentUser, token: string | null) => {
    const loginMode = nextCurrentUser.login_mode ?? (token ? 'password' : 'gateway');
    authSessionStore.setNeedsSetup(false);
    authSessionStore.setSession({
      token,
      currentUser: nextCurrentUser,
      loginMode,
    });
    setCurrentUser(nextCurrentUser);
    setUser(toLegacyUser(nextCurrentUser));
    setStatus('authenticated');
    setReady(true);
  }, []);

  const applyUnauthenticated = useCallback(() => {
    authSessionStore.clearSession();
    setCurrentUser(null);
    setUser(null);
    setStatus('unauthenticated');
    setReady(true);
  }, []);

  const refresh = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('checking');

    try {
      const nextCurrentUser = await authAdapter.getMe(controller.signal);
      applyAuthenticatedUser(nextCurrentUser, authSessionStore.getToken());
    } catch (error) {
      if (isAbortError(error)) return;
      applyUnauthenticated();
    }
  }, [applyAuthenticatedUser, applyUnauthenticated]);

  useEffect(() => {
    void refresh();
    return () => {
      abortRef.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    const handleAuthExpired = () => {
      abortRef.current?.abort();
      applyUnauthenticated();
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [applyUnauthenticated]);

  const login = useCallback(
    async ({ phone, password }: LoginParams): Promise<LoginResult> => {
      try {
        const loginResponse = await authAdapter.login(phone, password);
        const nextCurrentUser = await authAdapter.getMe();
        applyAuthenticatedUser(nextCurrentUser, loginResponse.token);

        const win = window as Window & { __websocketReconnect?: () => void };
        if (typeof window !== 'undefined' && win.__websocketReconnect) {
          win.__websocketReconnect();
        }

        return { success: true };
      } catch (error) {
        console.error('Login request failed:', error);
        return mapLoginError(error);
      }
    },
    [applyAuthenticatedUser]
  );

  const changePassword = useCallback(async ({ currentPassword, newPassword }: ChangePasswordParams) => {
    try {
      await authAdapter.changePassword(currentPassword, newPassword);
      return {
        success: true,
      };
    } catch (error) {
      console.error('Change password request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error. Please try again.',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    const loginMode = inferLoginMode(currentUser);

    try {
      if (loginMode === 'password') {
        await authAdapter.logout();
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      authSessionStore.clearSession();
      setCurrentUser(null);
      setUser(null);
      setStatus('unauthenticated');
      setReady(true);

      if (loginMode === 'gateway') {
        const gatewayLogoutUrl = getGatewayLogoutUrl();
        if (gatewayLogoutUrl) {
          window.location.assign(gatewayLogoutUrl);
        }
      }
    }
  }, [currentUser]);

  const hasPermission = useCallback((flag: string) => phase2HasPermission(currentUser, flag), [currentUser]);

  const hasAnyPermission = useCallback((flags: string[]) => phase2HasAnyPermission(currentUser, flags), [currentUser]);

  const value = useMemo<AuthContextValue>(
    () => ({
      ready,
      user,
      currentUser,
      permissionFlags: currentUser?.permission_flags ?? [],
      derived:
        currentUser?.derived ??
        (currentUser
          ? {
              is_admin: currentUser.is_admin,
              can_manage_users: currentUser.is_admin || phase2HasAnyPermission(currentUser, ['admin:user:list', 'admin:user:update']),
              can_manage_roles: currentUser.is_admin || phase2HasAnyPermission(currentUser, ['admin:role:list', 'admin:role:update']),
            }
          : null),
      status,
      login,
      changePassword,
      logout,
      refresh,
      clearAuthCache,
      hasPermission,
      hasAnyPermission,
    }),
    [changePassword, currentUser, hasAnyPermission, hasPermission, login, logout, ready, refresh, status, user]
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
