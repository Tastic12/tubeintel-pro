'use client';

import useSWR, { type SWRConfiguration, mutate as globalMutate } from 'swr';
import { Channel, Competitor, Video } from '@/types';
import { channelsApi, videosApi } from '@/services/api';
import { competitorListsApi } from '@/services/api/competitorLists';
import { videoCollectionsApi } from '@/services/api/videoCollections';
import { competitorVideosApi } from '@/services/api/competitorVideos';
import { secureYoutubeService } from '@/services/api/youtube-secure';
import { attachSqlOutlierScores } from '@/services/metrics/outlier-sync';
import { COMPETITOR_VIDEOS_PER_CHANNEL } from '@/lib/competitor-video-constants';
import { DASHBOARD_VIDEO_REFRESH_MS } from '@/lib/swr-config';
import { fetchApi, parseJsonResponse, postAuthedApi } from '@/lib/api-client';

export { COMPETITOR_VIDEOS_PER_CHANNEL };

export const swrKeys = {
  myChannel: 'my-channel',
  recentVideos: (limit: number) => ['recent-videos', limit] as const,
  competitorListsPage: 'competitor-lists-page',
  competitorsInList: (listId: string) => ['competitors-in-list', listId] as const,
  competitorListVideos: (listId: string) => ['competitor-list-videos', listId] as const,
  videoCollectionsPage: 'video-collections-page',
  collectionVideos: (collectionId: string) => ['collection-videos', collectionId] as const,
  discoverVideos: (categoryId: number | null, longFormOnly: boolean) =>
    ['discover-videos', categoryId, longFormOnly] as const,
} as const;

function swrLoading<T>(data: T | undefined, error: unknown) {
  return !error && data === undefined;
}

export function useMyChannel(config?: SWRConfiguration & { enabled?: boolean }) {
  const { enabled = true, ...swrConfig } = config ?? {};
  const { data, error, mutate, isValidating } = useSWR<Channel>(
    enabled ? swrKeys.myChannel : null,
    () => channelsApi.getMyChannel(),
    swrConfig
  );

  return {
    channel: data ?? null,
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

export function useRecentVideos(
  limit = 100,
  config?: SWRConfiguration & { onUpdated?: () => void }
) {
  const { onUpdated, ...swrConfig } = config ?? {};

  const { data, error, mutate, isValidating } = useSWR<Video[]>(
    swrKeys.recentVideos(limit),
    () => videosApi.getRecentVideos(limit),
    {
      refreshInterval: DASHBOARD_VIDEO_REFRESH_MS,
      onSuccess: () => onUpdated?.(),
      ...swrConfig,
    }
  );

  return {
    videos: data ?? [],
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

export interface CompetitorListWithItems {
  id: string;
  name: string;
  isPinned: boolean;
  competitors: Competitor[];
}

async function loadCompetitorListsPage(): Promise<CompetitorListWithItems[]> {
  const lists = await competitorListsApi.getUserLists();

  if (lists.length === 0) {
    return [];
  }

  const savedListsRaw =
    typeof window !== 'undefined' ? localStorage.getItem('competitorLists') : null;
  const savedLists: CompetitorListWithItems[] = savedListsRaw
    ? JSON.parse(savedListsRaw)
    : [];

  const listsWithCompetitors = await Promise.all(
    lists.map(async (list) => {
      const competitors = await competitorListsApi.getCompetitorsInList(list.id);
      const formattedCompetitors: Competitor[] = competitors.map((c) => ({
        id: c.id,
        youtubeId: c.youtubeId,
        name: c.name,
        thumbnailUrl: c.thumbnailUrl || '',
        subscriberCount: c.subscriberCount || 0,
        videoCount: c.videoCount || 0,
        viewCount: c.viewCount || 0,
      }));

      const savedList = savedLists.find((l) => l.id === list.id);

      return {
        id: list.id,
        name: list.name,
        isPinned: savedList?.isPinned ?? false,
        competitors: formattedCompetitors,
      };
    })
  );

  if (typeof window !== 'undefined') {
    localStorage.setItem('competitorLists', JSON.stringify(listsWithCompetitors));
  }

  return listsWithCompetitors;
}

export function useCompetitorListsPage(config?: SWRConfiguration) {
  const { data, error, mutate, isValidating } = useSWR<CompetitorListWithItems[]>(
    swrKeys.competitorListsPage,
    loadCompetitorListsPage,
    config
  );

  return {
    competitorLists: data ?? [],
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

/** Invalidate cached channel + video data after settings change. */
export function invalidateDashboardData() {
  return Promise.all([
    globalMutate(swrKeys.myChannel),
    globalMutate((key) => Array.isArray(key) && key[0] === 'recent-videos'),
  ]);
}

export function invalidateCompetitorListsData() {
  return globalMutate(swrKeys.competitorListsPage);
}

export function invalidateVideoCollectionsData() {
  return globalMutate(swrKeys.videoCollectionsPage);
}

function mapTrackedVideoToVideo(v: {
  id: string;
  youtubeId: string;
  channelId?: string | null;
  channelName?: string | null;
  title: string;
  thumbnailUrl?: string | null;
  publishedAt?: string | Date | null;
  viewCount?: number | null;
  likeCount?: number | null;
  duration?: string | null;
  description?: string | null;
  commentCount?: number | null;
  channelSubscriberCount?: number | null;
  channelVideoCount?: number | null;
  channelViewCount?: number | null;
  channelPublishedAt?: string | null;
}): Video {
  return {
    id: v.id,
    youtubeId: v.youtubeId,
    channelId: v.channelId || '',
    title: v.title,
    description: v.description || '',
    thumbnailUrl: v.thumbnailUrl || '',
    publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
    viewCount: v.viewCount || 0,
    likeCount: v.likeCount || 0,
    commentCount: v.commentCount ?? 0,
    vph: 0,
    durationIso: v.duration ?? null,
    channelName: v.channelName ?? null,
    channelSubscriberCount: v.channelSubscriberCount ?? null,
    channelVideoCount: v.channelVideoCount ?? null,
    channelViewCount: v.channelViewCount ?? null,
    channelPublishedAt: v.channelPublishedAt ? new Date(v.channelPublishedAt) : null,
  };
}

async function loadCompetitorsInList(listId: string): Promise<Competitor[]> {
  const competitors = await competitorListsApi.getCompetitorsInList(listId);
  const formattedCompetitors: Competitor[] = [];

  for (const c of competitors) {
    try {
      const channelData = await secureYoutubeService.getChannelById(c.youtubeId);
      formattedCompetitors.push({
        id: c.id,
        youtubeId: c.youtubeId,
        name: channelData.name,
        thumbnailUrl: channelData.thumbnailUrl,
        subscriberCount: channelData.subscriberCount,
        videoCount: channelData.videoCount,
        viewCount: channelData.viewCount,
        publishedAt: channelData.publishedAt ?? null,
      });
    } catch {
      formattedCompetitors.push({
        id: c.id,
        youtubeId: c.youtubeId,
        name: c.name,
        thumbnailUrl: c.thumbnailUrl || '',
        subscriberCount: c.subscriberCount || 0,
        videoCount: c.videoCount || 0,
        viewCount: c.viewCount || 0,
        publishedAt: null,
      });
    }
  }

  return formattedCompetitors;
}

export function useCompetitorsInList(
  listId: string | undefined,
  config?: SWRConfiguration
) {
  const { data, error, mutate, isValidating } = useSWR<Competitor[]>(
    listId ? swrKeys.competitorsInList(listId) : null,
    () => loadCompetitorsInList(listId!),
    config
  );

  return {
    competitors: data ?? [],
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

async function loadCompetitorListVideos(
  listId: string,
  competitors: Competitor[]
): Promise<Video[]> {
  if (!competitors.length) return [];

  try {
    const { videos } = await competitorVideosApi.syncListVideos(listId);

    const byChannel = new Map<string, Video[]>();
    for (const video of videos) {
      const bucket = byChannel.get(video.channelId) ?? [];
      bucket.push(video);
      byChannel.set(video.channelId, bucket);
    }

    const enriched: Video[] = [];
    for (const [channelId, channelVideos] of Array.from(byChannel.entries())) {
      enriched.push(...(await attachSqlOutlierScores(channelVideos, channelId)));
    }

    return enriched.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  } catch {
    return [];
  }
}

export function useCompetitorListVideos(
  listId: string | undefined,
  competitors: Competitor[],
  config?: SWRConfiguration
) {
  const ready = Boolean(listId) && competitors.length > 0;
  const { data, error, mutate, isValidating } = useSWR<Video[]>(
    ready ? swrKeys.competitorListVideos(listId!) : null,
    () => loadCompetitorListVideos(listId!, competitors),
    config
  );

  return {
    videos: data ?? [],
    isLoading: ready ? swrLoading(data, error) : false,
    isError: error,
    mutate,
    isValidating,
  };
}

export interface VideoCollectionWithItems {
  id: string;
  name: string;
  isPinned: boolean;
  videos: Video[];
}

async function loadVideoCollectionsPage(): Promise<VideoCollectionWithItems[]> {
  const collections = await videoCollectionsApi.getUserCollections();
  if (collections.length === 0) return [];

  const savedRaw =
    typeof window !== 'undefined' ? localStorage.getItem('videoCollections') : null;
  const savedCollections: VideoCollectionWithItems[] = savedRaw
    ? JSON.parse(savedRaw)
    : [];

  const collectionsWithVideos = await Promise.all(
    collections.map(async (collection) => {
      const videos = await videoCollectionsApi.getVideosInCollection(collection.id);
      const saved = savedCollections.find((c) => c.id === collection.id);
      return {
        id: collection.id,
        name: collection.name,
        isPinned: saved?.isPinned ?? false,
        videos: videos.map(mapTrackedVideoToVideo),
      };
    })
  );

  if (typeof window !== 'undefined') {
    localStorage.setItem('videoCollections', JSON.stringify(collectionsWithVideos));
  }

  return collectionsWithVideos;
}

export function useVideoCollectionsPage(config?: SWRConfiguration) {
  const { data, error, mutate, isValidating } = useSWR<VideoCollectionWithItems[]>(
    swrKeys.videoCollectionsPage,
    loadVideoCollectionsPage,
    config
  );

  return {
    videoCollections: data ?? [],
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

async function enrichCollectionVideos(
  trackedVideos: Awaited<ReturnType<typeof videoCollectionsApi.getVideosInCollection>>
): Promise<Video[]> {
  let videos = trackedVideos.map(mapTrackedVideoToVideo);

  const needsChannelIds = Array.from(
    new Set(
      videos
        .filter((v) => v.channelId && v.channelSubscriberCount == null)
        .map((v) => v.channelId)
    )
  );

  const needsVideoIds = trackedVideos
    .filter((t) => t.description == null || t.commentCount == null)
    .map((t) => t.youtubeId);

  const channelById = new Map<string, Channel>();
  for (const channelId of needsChannelIds) {
    try {
      channelById.set(channelId, await secureYoutubeService.getChannelById(channelId));
    } catch {
      // Skip channels that fail to load
    }
  }

  let freshVideosById = new Map<string, Video>();
  if (needsVideoIds.length) {
    try {
      const fresh = await secureYoutubeService.getVideosByIds(needsVideoIds);
      freshVideosById = new Map(fresh.map((v) => [v.youtubeId, v]));
    } catch {
      // Continue with stored snapshots
    }
  }

  videos = videos.map((video) => {
    const channel = video.channelId ? channelById.get(video.channelId) : undefined;
    const fresh = freshVideosById.get(video.youtubeId);
    const enriched: Video = {
      ...video,
      description: video.description || fresh?.description || '',
      commentCount: fresh?.commentCount ?? video.commentCount ?? 0,
      channelName: video.channelName || channel?.name || null,
      channelSubscriberCount:
        video.channelSubscriberCount ?? channel?.subscriberCount ?? null,
      channelVideoCount: video.channelVideoCount ?? channel?.videoCount ?? null,
      channelViewCount: video.channelViewCount ?? channel?.viewCount ?? null,
      channelPublishedAt:
        video.channelPublishedAt ?? channel?.publishedAt ?? null,
    };

    const shouldPersist =
      channel &&
      video.channelSubscriberCount == null &&
      video.id;

    if (shouldPersist) {
      void videoCollectionsApi.updateVideoFilterSnapshot(video.id, {
        description: enriched.description || null,
        commentCount: enriched.commentCount,
        channelName: enriched.channelName,
        channelSubscriberCount: enriched.channelSubscriberCount,
        channelVideoCount: enriched.channelVideoCount,
        channelViewCount: enriched.channelViewCount,
        channelPublishedAt: enriched.channelPublishedAt
          ? enriched.channelPublishedAt.toISOString()
          : null,
      });
    } else if (fresh && (trackedVideos.find((t) => t.id === video.id)?.commentCount == null)) {
      void videoCollectionsApi.updateVideoFilterSnapshot(video.id, {
        description: enriched.description || null,
        commentCount: enriched.commentCount,
      });
    }

    return enriched;
  });

  return videos;
}

async function loadCollectionVideos(collectionId: string): Promise<Video[]> {
  const trackedVideos = await videoCollectionsApi.getVideosInCollection(collectionId);
  return enrichCollectionVideos(trackedVideos);
}

export function useCollectionVideos(
  collectionId: string | undefined,
  config?: SWRConfiguration
) {
  const { data, error, mutate, isValidating } = useSWR<Video[]>(
    collectionId ? swrKeys.collectionVideos(collectionId) : null,
    () => loadCollectionVideos(collectionId!),
    config
  );

  return {
    videos: data ?? [],
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

export interface DiscoveredVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  channel_id: string | null;
  channel_name: string | null;
  category_id: number;
  region_code: string;
  published_at: string | null;
  view_count: number | null;
  like_count: number | null;
  is_short: boolean | null;
  last_seen_at: string;
}

export type DiscoverSettings = {
  region_code: string;
  category_ids: number[];
};

async function getDiscoverAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('@/lib/supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

export function useDiscoverVideos(categoryId?: number | null, longFormOnly = true) {
  const { data, error, mutate, isValidating } = useSWR(
    swrKeys.discoverVideos(categoryId ?? null, longFormOnly),
    async () => {
      const headers = await getDiscoverAuthHeaders();
      const params = new URLSearchParams({ limit: '100' });
      if (categoryId) params.set('category_id', String(categoryId));
      if (longFormOnly) params.set('long_form_only', '1');
      return fetchApi<{
        videos: DiscoveredVideo[];
        region_code: string;
        category_ids: number[];
        stats?: {
          rows_in_db: number;
          unique_videos: number;
          showing: number;
          shorts_in_pool: number;
          long_form_in_pool?: number;
        };
      }>(`/api/discover/videos?${params}`, { headers });
    }
  );

  return {
    videos: data?.videos,
    stats: data?.stats,
    regionCode: data?.region_code,
    categoryIds: data?.category_ids,
    isLoading: swrLoading(data, error),
    isError: error,
    mutate,
    isValidating,
  };
}

export async function fetchDiscoverSettings(): Promise<DiscoverSettings> {
  const headers = await getDiscoverAuthHeaders();
  return fetchApi<DiscoverSettings>('/api/discover/settings', { headers });
}

export async function saveDiscoverSettings(settings: DiscoverSettings) {
  const headers = await getDiscoverAuthHeaders();
  const response = await fetch('/api/discover/settings', {
    method: 'PUT',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  return parseJsonResponse<{ success: boolean; settings: DiscoverSettings }>(response);
}

export async function syncDiscoverTrending() {
  return postAuthedApi<{
    saved: number;
    unique_videos: number;
    fetched: number;
    api_calls: number;
    message?: string;
    errors?: string[];
  }>('/api/discover/sync', {});
}

export type ThumbnailSearchResult = {
  youtube_video_id: string;
  thumbnail_url: string;
  similarity: number;
  title: string | null;
  view_count: number | null;
  published_at: string | null;
  outlier_score: number | null;
  is_short: boolean | null;
  source: 'own' | 'competitor' | 'discovered' | 'collection' | 'youtube_expand' | 'unknown';
  channel_id: string | null;
  channel_name: string | null;
};

async function getThumbnailAuthHeaders(): Promise<HeadersInit> {
  const { supabase } = await import('@/lib/supabase');
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function searchThumbnails(query: string, matchCount = 24): Promise<ThumbnailSearchResult[]> {
  const result = await postAuthedApi<{ results: ThumbnailSearchResult[] }>('/api/thumbnails/search', {
    query,
    match_count: String(matchCount),
  });
  return result.results || [];
}

export async function searchSimilarToVideo(
  youtubeVideoId: string,
  matchCount = 24
): Promise<ThumbnailSearchResult[]> {
  const result = await postAuthedApi<{ results: ThumbnailSearchResult[] }>(
    '/api/thumbnails/search-similar',
    { youtube_video_id: youtubeVideoId, match_count: String(matchCount) }
  );
  return result.results || [];
}

export async function searchThumbnailsByImage(
  file: File,
  matchCount = 24
): Promise<ThumbnailSearchResult[]> {
  const headers = await getThumbnailAuthHeaders();
  const form = new FormData();
  form.append('image', file);
  form.append('match_count', String(matchCount));
  const response = await fetch('/api/thumbnails/search-image', {
    method: 'POST',
    headers,
    body: form,
  });
  const json = await parseJsonResponse<{ results: ThumbnailSearchResult[] }>(response);
  return json.results || [];
}

export async function expandThumbnailSearchOnYouTube(input: {
  nicheQuery: string;
  styleQuery?: string;
  referenceVideoId?: string;
  maxResults?: number;
}): Promise<{ results: ThumbnailSearchResult[]; message?: string }> {
  const result = await postAuthedApi<{ results: ThumbnailSearchResult[]; message?: string }>(
    '/api/thumbnails/expand-search',
    {
      niche_query: input.nicheQuery,
      style_query: input.styleQuery,
      reference_video_id: input.referenceVideoId,
      max_results: input.maxResults ?? 25,
    }
  );
  return { results: result.results || [], message: result.message };
}

export async function embedThumbnailBatch(): Promise<{ processed: number; remaining: number }> {
  return postAuthedApi('/api/thumbnails/embed-batch', {});
}

export async function fetchPendingThumbnailCount(): Promise<number> {
  const headers = await getThumbnailAuthHeaders();
  const json = await fetchApi<{ count?: number }>('/api/thumbnails/pending-count', { headers });
  return json.count ?? 0;
}

export type ThumbnailIndexStat = {
  source: string;
  total: number;
  indexed: number;
  pending: number;
};

export async function fetchThumbnailIndexStats(): Promise<{
  bySource: ThumbnailIndexStat[];
  totals: { total: number; indexed: number; pending: number };
}> {
  const headers = await getThumbnailAuthHeaders();
  return fetchApi('/api/thumbnails/index-stats', { headers });
}
