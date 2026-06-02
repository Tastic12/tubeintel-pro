/**
 * Shared YouTube API response cache (Upstash Redis + in-memory fallback).
 * Required on Vercel/serverless — in-memory-only cache does not survive cold starts.
 */
import { Redis } from '@upstash/redis';

const PREFIX = 'ytapi:';
const memory = new Map<string, { data: unknown; timestamp: number }>();

let redisClient: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

export type YouTubeCacheEntry = {
  data: unknown;
  timestamp: number;
};

export async function getCachedYouTubeResponse(
  key: string
): Promise<YouTubeCacheEntry | null> {
  const memoryHit = memory.get(key);
  if (memoryHit) return memoryHit;

  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get<YouTubeCacheEntry | string>(PREFIX + key);
    if (!raw) return null;
    const entry: YouTubeCacheEntry =
      typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (entry?.data != null && typeof entry.timestamp === 'number') {
      memory.set(key, entry);
      return entry;
    }
  } catch (error) {
    console.warn('[youtube-api-cache] Redis read failed:', error);
  }
  return null;
}

export async function setCachedYouTubeResponse(
  key: string,
  data: unknown
): Promise<void> {
  const entry: YouTubeCacheEntry = { data, timestamp: Date.now() };
  memory.set(key, entry);

  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(PREFIX + key, JSON.stringify(entry), {
      ex: 7 * 24 * 60 * 60,
    });
  } catch (error) {
    console.warn('[youtube-api-cache] Redis write failed:', error);
  }
}
