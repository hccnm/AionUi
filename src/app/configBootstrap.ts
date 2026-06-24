export type ConfigBootstrapAuthStatus = 'checking' | 'authenticated' | 'unauthenticated';
export type ConfigBootstrapAction = 'wait' | 'initialize' | 'reset';

export function getConfigBootstrapAction(status: ConfigBootstrapAuthStatus): ConfigBootstrapAction {
  if (status === 'checking') {
    return 'wait';
  }

  if (status === 'authenticated') {
    return 'initialize';
  }

  return 'reset';
}
