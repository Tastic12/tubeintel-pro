import type { LimiterId } from '@/lib/rate-limit';

export type YouTubeFetchContext = {
  userId?: string | null;
  /** Key for Upstash rate limits (user id or anon:ip) */
  rateLimitKey?: string;
  limiterId?: LimiterId;
};
