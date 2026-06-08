import type { Video } from '@/types';
import { fetchApi, postAuthedApi } from '@/lib/api-client';

type CompetitorVideosResponse = {
  videos: Video[];
  newVideos?: number;
  apiCallsSkipped?: boolean;
  source?: string;
};

export const competitorVideosApi = {
  /** Read persisted videos only — no YouTube API. */
  getCachedListVideos: async (listId: string): Promise<Video[]> => {
    const data = await fetchApi<CompetitorVideosResponse>(
      `/api/competitors/videos/sync?listId=${encodeURIComponent(listId)}`,
      { credentials: 'include' }
    );
    return data.videos ?? [];
  },

  /** Incremental sync — YouTube called only for new uploads (or when stale). */
  syncListVideos: async (
    listId: string,
    options?: { force?: boolean }
  ): Promise<CompetitorVideosResponse> => {
    return postAuthedApi<CompetitorVideosResponse>('/api/competitors/videos/sync', {
      listId,
      force: options?.force ?? false,
    });
  },
};
