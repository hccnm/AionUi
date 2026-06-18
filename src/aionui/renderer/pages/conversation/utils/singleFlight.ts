/**
 * @license
 * Copyright 2025 AionUi (aionui.com)
 * SPDX-License-Identifier: Apache-2.0
 */

export function runSingleFlight<K, V>(inflight: Map<K, Promise<V>>, key: K, factory: () => Promise<V>): Promise<V> {
  const existing = inflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = factory().finally(() => {
    if (inflight.get(key) === promise) {
      inflight.delete(key);
    }
  });

  inflight.set(key, promise);
  return promise;
}
