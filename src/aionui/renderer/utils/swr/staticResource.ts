import type { SWRConfiguration } from 'swr';

// Startup catalogs are effectively static until an explicit mutate/refresh.
export const STATIC_RESOURCE_SWR_OPTIONS: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 10000,
};
