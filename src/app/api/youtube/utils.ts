import { NextResponse } from 'next/server';
import { estimateYouTubeApiUnits, getServiceAdmin, logYoutubeApiUsage } from '@/lib/admin';
import { checkRateLimit } from '@/lib/rate-limit';
import type { YouTubeFetchContext } from '@/lib/youtube-fetch-context';

export type { YouTubeFetchContext } from '@/lib/youtube-fetch-context';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3';

if (!YOUTUBE_API_KEY) {
  console.error('YouTube API key is not configured. Please set YOUTUBE_API_KEY in your environment variables.');
}

const cache = new Map<string, { data: unknown; timestamp: number }>();

const CACHE_DURATIONS = {
  CHANNEL: 24 * 60 * 60 * 1000,
  VIDEO: 4 * 60 * 60 * 1000,
  SEARCH: 2 * 60 * 60 * 1000,
  VIDEO_STATS: 1 * 60 * 60 * 1000,
};

const EXTENDED_CACHE_DURATIONS = {
  CHANNEL: 7 * 24 * 60 * 60 * 1000,
  VIDEO: 24 * 60 * 60 * 1000,
  SEARCH: 12 * 60 * 60 * 1000,
  VIDEO_STATS: 4 * 60 * 60 * 1000,
};

function getCacheDuration(endpoint: string, params: Record<string, string>) {
  if (endpoint === 'channels') {
    return {
      normal: CACHE_DURATIONS.CHANNEL,
      extended: EXTENDED_CACHE_DURATIONS.CHANNEL,
    };
  }
  if (endpoint === 'search') {
    return {
      normal: CACHE_DURATIONS.SEARCH,
      extended: EXTENDED_CACHE_DURATIONS.SEARCH,
    };
  }
  if (endpoint === 'videos' && params.chart === 'mostPopular') {
    return {
      normal: CACHE_DURATIONS.VIDEO_STATS,
      extended: EXTENDED_CACHE_DURATIONS.VIDEO_STATS,
    };
  }
  return {
    normal: CACHE_DURATIONS.VIDEO,
    extended: EXTENDED_CACHE_DURATIONS.VIDEO,
  };
}

async function recordYouTubeApiCall(
  endpoint: string,
  context?: YouTubeFetchContext
) {
  try {
    const admin = getServiceAdmin();
    await logYoutubeApiUsage(admin, {
      userId: context?.userId,
      endpoint,
      units: estimateYouTubeApiUnits(endpoint),
    });
  } catch {
    // Quota logging is optional when service role or table is missing.
  }
}

async function callYouTubeApi(
  endpoint: string,
  params: Record<string, string>,
  context?: YouTubeFetchContext
) {
  const rateLimitKey = context?.rateLimitKey ?? context?.userId ?? 'anonymous';
  if (context?.limiterId) {
    const rl = await checkRateLimit(rateLimitKey, context.limiterId);
    if (!rl.ok) {
      return {
        ok: false as const,
        status: rl.status,
        statusText: 'Too Many Requests',
        errorData: { error: rl.message },
        rateLimited: true as const,
      };
    }
  }

  const searchParams = new URLSearchParams({
    ...params,
    key: YOUTUBE_API_KEY!,
  });
  const url = `${YOUTUBE_API_BASE_URL}/${endpoint}?${searchParams.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json();
    return {
      ok: false as const,
      status: response.status,
      statusText: response.statusText,
      errorData,
    };
  }

  const data = await response.json();
  await recordYouTubeApiCall(endpoint, context);
  return { ok: true as const, data };
}

export async function fetchFromYouTubeApi(
  endpoint: string,
  params: Record<string, string>,
  context: YouTubeFetchContext = {}
) {
  try {
    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }

    const cacheKey = `${endpoint}:${JSON.stringify(params)}`;
    const { normal: cacheDuration, extended: extendedCacheDuration } =
      getCacheDuration(endpoint, params);

    const cachedData = cache.get(cacheKey);
    const now = Date.now();

    if (cachedData) {
      const dataAge = now - cachedData.timestamp;
      const isStaleData = dataAge < extendedCacheDuration;

      if (dataAge < cacheDuration) {
        return NextResponse.json(cachedData.data);
      }

      if (isStaleData) {
        const result = await callYouTubeApi(endpoint, params, context);
        if (result.ok) {
          cache.set(cacheKey, { data: result.data, timestamp: now });
          return NextResponse.json(result.data);
        }

        if (result.status === 429 || ('rateLimited' in result && result.rateLimited)) {
          cache.set(cacheKey, {
            data: cachedData.data,
            timestamp: now - cacheDuration / 2,
          });
          return NextResponse.json(cachedData.data);
        }

        return NextResponse.json(
          { error: `YouTube API Error: ${result.statusText}`, details: result.errorData },
          { status: result.status }
        );
      }
    }

    const result = await callYouTubeApi(endpoint, params, context);
    if (!result.ok) {
      return NextResponse.json(
        { error: `YouTube API Error: ${result.statusText}`, details: result.errorData },
        { status: result.status }
      );
    }

    cache.set(cacheKey, { data: result.data, timestamp: now });
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Server error in YouTube API request:', error);
    return NextResponse.json(
      { error: 'Internal server error processing YouTube API request' },
      { status: 500 }
    );
  }
}
