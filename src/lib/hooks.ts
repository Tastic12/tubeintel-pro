'use client';

import useSWR, { type SWRConfiguration, mutate as globalMutate } from 'swr';
import { Channel, Competitor, Video } from '@/types';
import { channelsApi, videosApi } from '@/services/api';
import { competitorListsApi } from '@/services/api/competitorLists';
import { videoCollectionsApi } from '@/services/api/videoCollections';
import { secureYoutubeService } from '@/services/api/youtube-secure';
import { DASHBOARD_VIDEO_REFRESH_MS } from '@/lib/swr-config';

export const swrKeys = {
  myChannel: 'my-channel',
  recentVideos: (limit: number) => ['recent-videos', limit] as const,
  competitorListsPage: 'competitor-lists-page',
  competitorsInList: (listId: string) => ['competitors-in-list', listId] as const,
  competitorListVideos: (listId: string) => ['competitor-list-videos', listId] as const,
  videoCollectionsPage: 'video-collections-page',
  collectionVideos: (collectionId: string) => ['collection-videos', collectionId] as const,
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
  title: string;
  thumbnailUrl?: string | null;
  publishedAt?: string | Date | null;
  viewCount?: number | null;
  likeCount?: number | null;
  duration?: string | null;
}): Video {
  return {
    id: v.id,
    youtubeId: v.youtubeId,
    channelId: v.channelId || '',
    title: v.title,
    description: '',
    thumbnailUrl: v.thumbnailUrl || '',
    publishedAt: v.publishedAt ? new Date(v.publishedAt) : new Date(),
    viewCount: v.viewCount || 0,
    likeCount: v.likeCount || 0,
    commentCount: 0,
    vph: 0,
    durationIso: v.duration ?? null,
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

async function loadCompetitorListVideos(competitors: Competitor[]): Promise<Video[]> {
  if (!competitors.length) return [];

  const allVideos: Video[] = [];
  for (const competitor of competitors) {
    try {
      const videos = await secureYoutubeService.getVideosByChannelId(
        competitor.youtubeId,
        10
      );
      allVideos.push(...videos);
    } catch {
      // Skip channels that fail to load
    }
  }

  return allVideos.sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}

export function useCompetitorListVideos(
  listId: string | undefined,
  competitors: Competitor[],
  config?: SWRConfiguration
) {
  const ready = Boolean(listId) && competitors.length > 0;
  const { data, error, mutate, isValidating } = useSWR<Video[]>(
    ready ? swrKeys.competitorListVideos(listId!) : null,
    () => loadCompetitorListVideos(competitors),
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

async function loadCollectionVideos(collectionId: string): Promise<Video[]> {
  const trackedVideos = await videoCollectionsApi.getVideosInCollection(collectionId);
  return trackedVideos.map(mapTrackedVideoToVideo);
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
