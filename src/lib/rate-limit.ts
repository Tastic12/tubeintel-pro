/**
 * Per-user rate limits on YouTube API proxy routes (Upstash Redis).
 * No-op when UPSTASH_REDIS_REST_URL / TOKEN are unset — local dev keeps working.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type LimiterId =
  | 'sync-videos'
  | 'competitors-init'
  | 'competitors-refresh'
  | 'discover-sync'
  | 'thumbnail-search'
  | 'thumbnail-expand';

type LimiterSpec = {
  perMinute: number;
  perDay: number;
};

const LIMITS: Record<LimiterId, LimiterSpec> = {
  // search-only limits (100 YouTube quota units per call)
  'sync-videos': { perMinute: 10, perDay: 100 },
  'competitors-init': { perMinute: 20, perDay: 150 },
  'competitors-refresh': { perMinute: 10, perDay: 80 },
  'discover-sync': { perMinute: 2, perDay: 10 },
  'thumbnail-search': { perMinute: 10, perDay: 120 },
  'thumbnail-expand': { perMinute: 2, perDay: 15 },
};

let warnedAboutMissingEnv = false;

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warnedAboutMissingEnv) {
      console.warn(
        '[rate-limit] UPSTASH_REDIS_REST_URL / TOKEN not set — rate limiting is DISABLED.'
      );
      warnedAboutMissingEnv = true;
    }
    return null;
  }
  return new Redis({ url, token });
}

const cache = new Map<string, Ratelimit>();

function getLimiter(
  redis: Redis,
  id: LimiterId,
  window: 'minute' | 'day'
): Ratelimit {
  const key = `${id}:${window}`;
  const existing = cache.get(key);
  if (existing) return existing;
  const spec = LIMITS[id];
  const tokens = window === 'minute' ? spec.perMinute : spec.perDay;
  const duration = window === 'minute' ? '1 m' : '1 d';
  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(tokens, duration),
    analytics: false,
    prefix: `ratelimit:${id}:${window}`,
  });
  cache.set(key, rl);
  return rl;
}

export type RateLimitResult =
  | { ok: true }
  | {
      ok: false;
      status: 429;
      message: string;
      retryAfterSeconds: number;
      scope: 'minute' | 'day';
    };

export async function checkRateLimit(
  userId: string,
  limiterId: LimiterId
): Promise<RateLimitResult> {
  // Local dev should not inherit production Upstash counters from repeated hot reloads.
  if (process.env.NODE_ENV === 'development') {
    return { ok: true };
  }

  const redis = getRedis();
  if (!redis) return { ok: true };

  const dayLimiter = getLimiter(redis, limiterId, 'day');
  const minuteLimiter = getLimiter(redis, limiterId, 'minute');

  const dayRes = await dayLimiter.limit(userId);
  if (!dayRes.success) {
    const wait = Math.max(1, Math.ceil((dayRes.reset - Date.now()) / 1000));
    return {
      ok: false,
      status: 429,
      message: `Daily limit reached for this action (${LIMITS[limiterId].perDay}/day). Try again in ${formatWait(wait)}.`,
      retryAfterSeconds: wait,
      scope: 'day',
    };
  }

  const minRes = await minuteLimiter.limit(userId);
  if (!minRes.success) {
    const wait = Math.max(1, Math.ceil((minRes.reset - Date.now()) / 1000));
    return {
      ok: false,
      status: 429,
      message: `Slow down — you can run this ${LIMITS[limiterId].perMinute} times per minute. Try again in ${wait}s.`,
      retryAfterSeconds: wait,
      scope: 'minute',
    };
  }

  return { ok: true };
}

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.ceil(seconds / 60)} min`;
  return `${Math.ceil(seconds / 3600)}h`;
}
