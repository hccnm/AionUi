export const MOCK_SERVICE_WORKER_URL = '/mock-service-worker.js';

type ServiceWorkerRegistrationLike = {
  active?: { scriptURL?: string } | null;
  installing?: { scriptURL?: string } | null;
  waiting?: { scriptURL?: string } | null;
  unregister?: () => Promise<boolean>;
};

type ServiceWorkerContainerLike = {
  register: (scriptURL: string, options?: RegistrationOptions) => Promise<unknown>;
  ready?: Promise<unknown>;
  getRegistrations?: () => Promise<readonly ServiceWorkerRegistrationLike[]>;
};

type RegisterMockServiceWorkerOptions = {
  mode?: string;
  workerUrl?: string;
  serviceWorker?: ServiceWorkerContainerLike;
};

export type RegisterMockServiceWorkerResult = {
  enabled: boolean;
  registered: boolean;
  reason: 'disabled' | 'registered' | 'unsupported' | 'registration-failed';
};

function getConfiguredMockMode(): string {
  return import.meta.env.VITE_AIONWEB_MOCK_MODE ?? '';
}

function getBrowserServiceWorker(): ServiceWorkerContainerLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.serviceWorker;
}

function isMockRegistration(registration: ServiceWorkerRegistrationLike, workerUrl: string): boolean {
  const scriptName = workerUrl.replace(/^\//, '');
  const scriptUrls = [
    registration.active?.scriptURL,
    registration.installing?.scriptURL,
    registration.waiting?.scriptURL,
  ].filter(Boolean);
  return scriptUrls.some((scriptUrl) => scriptUrl?.endsWith(scriptName));
}

async function unregisterMockServiceWorker(serviceWorker: ServiceWorkerContainerLike, workerUrl: string): Promise<void> {
  const registrations = await serviceWorker.getRegistrations?.();
  if (!registrations) return;
  await Promise.all(
    registrations
      .filter((registration) => isMockRegistration(registration, workerUrl))
      .map((registration) => registration.unregister?.())
  );
}

export function isInterceptMockMode(mode = getConfiguredMockMode()): boolean {
  return mode.trim().toLowerCase() === 'intercept';
}

export async function registerMockServiceWorker(
  options: RegisterMockServiceWorkerOptions = {}
): Promise<RegisterMockServiceWorkerResult> {
  const mode = options.mode ?? getConfiguredMockMode();
  const workerUrl = options.workerUrl ?? MOCK_SERVICE_WORKER_URL;
  const serviceWorker = options.serviceWorker ?? getBrowserServiceWorker();

  if (!isInterceptMockMode(mode)) {
    if (serviceWorker) await unregisterMockServiceWorker(serviceWorker, workerUrl);
    return { enabled: false, registered: false, reason: 'disabled' };
  }

  if (!serviceWorker) {
    return { enabled: true, registered: false, reason: 'unsupported' };
  }

  try {
    await serviceWorker.register(workerUrl, { scope: '/' });
    await serviceWorker.ready;
    return { enabled: true, registered: true, reason: 'registered' };
  } catch {
    return { enabled: true, registered: false, reason: 'registration-failed' };
  }
}
