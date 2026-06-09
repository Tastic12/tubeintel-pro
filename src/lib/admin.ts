import { createAdminClient } from '@/utils/supabase/server';
import type { SupabaseClient } from '@supabase/supabase-js';

/** YouTube Data API v3 default daily quota per project key. */
export const YOUTUBE_DAILY_QUOTA = 10_000;

/** Estimated quota units per YouTube API resource type. */
export function estimateYouTubeApiUnits(endpoint: string): number {
  if (endpoint === 'search') return 100;
  return 1;
}

/**
 * Log estimated YouTube API unit consumption. Fire-and-forget — never blocks callers.
 */
export async function logYoutubeApiUsage(
  admin: SupabaseClient,
  opts: { userId?: string | null; endpoint: string; units?: number }
) {
  try {
    await admin.from('youtube_api_usage').insert({
      user_id: opts.userId ?? null,
      endpoint: opts.endpoint,
      units: opts.units ?? estimateYouTubeApiUnits(opts.endpoint),
    });
  } catch {
    // Logging must never break the main request path.
  }
}

export function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const raw = process.env.ADMIN_EMAILS || '';
  const allowed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!allowed.length) return false;
  return allowed.includes(email.toLowerCase());
}

export async function getYoutubeUsageSummary(admin: SupabaseClient, since?: Date) {
  const { data, error } = await admin.rpc('youtube_api_usage_summary', {
    since_ts: since?.toISOString() ?? null,
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return {
    totalUnits: Number(row?.total_units ?? 0),
    callCount: Number(row?.call_count ?? 0),
    byEndpoint: (row?.by_endpoint ?? {}) as Record<string, number>,
    remaining: Math.max(0, YOUTUBE_DAILY_QUOTA - Number(row?.total_units ?? 0)),
  };
}

export function getServiceAdmin() {
  return createAdminClient();
}
