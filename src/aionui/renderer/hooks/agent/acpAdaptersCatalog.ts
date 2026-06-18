import { ipcBridge } from '@/common';

export const ACP_ADAPTERS_SWR_KEY = 'extensions.acpAdapters';

let acpAdaptersPromise: Promise<Record<string, unknown>[]> | null = null;

export async function fetchAcpAdaptersCatalog(): Promise<Record<string, unknown>[]> {
  if (acpAdaptersPromise) {
    return acpAdaptersPromise;
  }

  acpAdaptersPromise = ipcBridge.extensions.getAcpAdapters
    .invoke()
    .catch((error) => {
      console.error('Failed to load extension ACP adapters:', error);
      return [] as Record<string, unknown>[];
    })
    .finally(() => {
      acpAdaptersPromise = null;
    });

  return acpAdaptersPromise;
}
