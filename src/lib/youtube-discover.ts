import { pickThumbnailFromYoutube } from './thumbnail-meta';

/** YouTube Data API videoCategoryId values (common categories). */
export const YOUTUBE_VIDEO_CATEGORIES = [
  { id: 1, label: 'Film & Animation' },
  { id: 2, label: 'Autos & Vehicles' },
  { id: 10, label: 'Music' },
  { id: 15, label: 'Pets & Animals' },
  { id: 17, label: 'Sports' },
  { id: 20, label: 'Gaming' },
  { id: 22, label: 'People & Blogs' },
  { id: 23, label: 'Comedy' },
  { id: 24, label: 'Entertainment' },
  { id: 25, label: 'News & Politics' },
  { id: 26, label: 'How-to & Style' },
  { id: 27, label: 'Education' },
  { id: 28, label: 'Science & Technology' },
] as const;

export const DEFAULT_DISCOVER_CATEGORY_IDS = [20, 24, 25, 28, 17] as const;

export const DISCOVER_REGIONS = [
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'AU', label: 'Australia' },
  { code: 'CA', label: 'Canada' },
] as const;

export function normalizeDiscoverCategoryIds(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_DISCOVER_CATEGORY_IDS];
  }
  const ids = raw.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0);
  return ids.length ? ids : [...DEFAULT_DISCOVER_CATEGORY_IDS];
}

export function normalizeDiscoverRegion(raw: unknown): string {
  if (typeof raw === 'string' && raw.trim()) {
    return raw.trim().toUpperCase();
  }
  return 'GB';
}

export function categoryLabel(categoryId: number): string {
  return (
    YOUTUBE_VIDEO_CATEGORIES.find((c) => c.id === categoryId)?.label ??
    `Category ${categoryId}`
  );
}

export type TrendingVideoRecord = {
  video_id: string;
  title: string;
  thumbnail_url: string;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  channel_id: string;
  channel_name: string;
  category_id: number;
  region_code: string;
  published_at: string | null;
  duration: string | null;
  view_count: number;
  like_count: number;
};

type YouTubeTrendingResponse = {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelId: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        maxres?: { url: string; width?: number; height?: number };
        standard?: { url: string; width?: number; height?: number };
        high?: { url: string; width?: number; height?: number };
        medium?: { url: string; width?: number; height?: number };
      };
      categoryId?: string;
    };
    statistics?: {
      viewCount?: string;
      likeCount?: string;
    };
    contentDetails?: {
      duration?: string;
    };
  }>;
  error?: { message?: string };
};

export async function fetchTrendingForCategory(
  apiKey: string,
  regionCode: string,
  categoryId: number,
  maxResults = 50
): Promise<TrendingVideoRecord[]> {
  const params = new URLSearchParams({
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode,
    videoCategoryId: String(categoryId),
    maxResults: String(Math.min(maxResults, 50)),
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params.toString()}`
  );
  const data = (await response.json()) as YouTubeTrendingResponse;

  if (!response.ok) {
    throw new Error(data.error?.message || `YouTube API error (${response.status})`);
  }

  return (data.items ?? []).map((item) => {
    const picked = pickThumbnailFromYoutube(item.snippet.thumbnails);

    return {
      video_id: item.id,
      title: item.snippet.title,
      thumbnail_url: picked.url || '',
      thumbnail_width: picked.width,
      thumbnail_height: picked.height,
      channel_id: item.snippet.channelId,
      channel_name: item.snippet.channelTitle,
      // Use the chart category we queried — snippet.categoryId can differ and
      // causes duplicate upsert keys when the same video trends in multiple charts.
      category_id: categoryId,
      region_code: regionCode,
      published_at: item.snippet.publishedAt || null,
      duration: item.contentDetails?.duration ?? null,
      view_count: parseInt(item.statistics?.viewCount || '0', 10) || 0,
      like_count: parseInt(item.statistics?.likeCount || '0', 10) || 0,
    };
  });
}

export async function fetchTrendingBatch(
  apiKey: string,
  regionCode: string,
  categoryIds: number[],
  delayMs = 200
): Promise<{ records: TrendingVideoRecord[]; apiCalls: number; errors: string[] }> {
  const records: TrendingVideoRecord[] = [];
  const errors: string[] = [];
  let apiCalls = 0;

  for (const categoryId of categoryIds) {
    try {
      const batch = await fetchTrendingForCategory(apiKey, regionCode, categoryId);
      records.push(...batch);
      apiCalls += 1;
    } catch (err) {
      errors.push(
        `${categoryLabel(categoryId)}: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }

  return { records, apiCalls, errors };
}
