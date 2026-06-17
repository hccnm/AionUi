type BrowserProcessEnv = {
  NODE_ENV: 'development' | 'production';
  AIONUI_MULTI_INSTANCE: string;
  [key: string]: string;
};

type BrowserProcessShim = {
  cwd: () => string;
  env: BrowserProcessEnv;
  platform: string;
  type?: string;
  versions: Record<string, string | undefined>;
};

const runtimeGlobal = globalThis as {
  process?: unknown;
};

const runtimeProcess = runtimeGlobal.process as unknown as BrowserProcessShim | undefined;

if (!runtimeProcess) {
  const platform = navigator.userAgent.includes('Mac OS X')
    ? 'darwin'
    : navigator.userAgent.includes('Windows')
      ? 'win32'
      : 'linux';

  runtimeGlobal.process = {
    cwd: () => '/',
    env: {
      NODE_ENV: import.meta.env.PROD ? 'production' : 'development',
      AIONUI_MULTI_INSTANCE: '0',
    },
    platform,
    versions: {},
  } as BrowserProcessShim;
}
