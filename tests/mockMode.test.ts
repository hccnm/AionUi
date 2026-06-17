import { describe, expect, it, vi } from 'vitest';
import {
  isInterceptMockMode,
  MOCK_SERVICE_WORKER_URL,
  registerMockServiceWorker,
} from '../src/mock/mockMode';

describe('request intercept mock mode', () => {
  it('is enabled only by the explicit intercept mode value', () => {
    expect(isInterceptMockMode('intercept')).toBe(true);
    expect(isInterceptMockMode(' INTERCEPT ')).toBe(true);
    expect(isInterceptMockMode('')).toBe(false);
    expect(isInterceptMockMode('off')).toBe(false);
    expect(isInterceptMockMode('mock')).toBe(false);
  });

  it('does not register a service worker when intercept mode is disabled', async () => {
    const serviceWorker = {
      register: vi.fn(),
      ready: Promise.resolve({ scope: '/' }),
    };

    const result = await registerMockServiceWorker({ mode: 'off', serviceWorker });

    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(result).toEqual({ enabled: false, registered: false, reason: 'disabled' });
  });

  it('unregisters a previous mock service worker when intercept mode is disabled', async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const serviceWorker = {
      register: vi.fn(),
      ready: Promise.resolve({ scope: '/' }),
      getRegistrations: vi.fn().mockResolvedValue([
        { active: { scriptURL: 'http://localhost:5177/mock-service-worker.js' }, unregister },
        { active: { scriptURL: 'http://localhost:5177/other-worker.js' }, unregister: vi.fn() },
      ]),
    };

    const result = await registerMockServiceWorker({ mode: 'off', serviceWorker });

    expect(serviceWorker.register).not.toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ enabled: false, registered: false, reason: 'disabled' });
  });

  it('registers the mock service worker when intercept mode is enabled', async () => {
    const registration = { scope: 'http://localhost:5177/' };
    const serviceWorker = {
      register: vi.fn().mockResolvedValue(registration),
      ready: Promise.resolve(registration),
    };

    const result = await registerMockServiceWorker({ mode: 'intercept', serviceWorker });

    expect(serviceWorker.register).toHaveBeenCalledWith(MOCK_SERVICE_WORKER_URL, { scope: '/' });
    expect(result).toEqual({ enabled: true, registered: true, reason: 'registered' });
  });

  it('does not throw when service worker registration fails', async () => {
    const serviceWorker = {
      register: vi.fn().mockRejectedValue(new Error('registration failed')),
      ready: Promise.resolve({ scope: '/' }),
    };

    const result = await registerMockServiceWorker({ mode: 'intercept', serviceWorker });

    expect(result).toEqual({ enabled: true, registered: false, reason: 'registration-failed' });
  });
});
