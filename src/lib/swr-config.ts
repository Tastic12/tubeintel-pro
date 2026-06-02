import type { SWRConfiguration } from 'swr';

/** Default SWR behaviour — matches prior manual fetch patterns where possible. */
export const defaultSwrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 30_000,
  errorRetryCount: 2,
};

/** Dashboard video list — background refresh every 4 hours (same as before). */
export const DASHBOARD_VIDEO_REFRESH_MS = 4 * 60 * 60 * 1000;
