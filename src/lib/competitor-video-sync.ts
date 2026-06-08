import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchYouTubeApiData } from '@/app/api/youtube/utils';
import type { YouTubeFetchContext } from '@/lib/youtube-fetch-context';
import {
  pickPortraitClassificationDims,
  pickThumbnailFromYoutube,
} from '@/lib/thumbnail-meta';
import {
  COMPETITOR_VIDEO_SYNC_INTERVAL_MS,
  COMPETITOR_VIDEOS_PER_CHANNEL,
} from '@/lib/competitor-video-constants';
import type { Video } from '@/types';

export type StoredCompetitorVideoRow = {
  id: string;
  tracked_competitor_id: string;
  list_id: string;
  youtube_video_id: string;
  youtube_channel_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  thumbnail_width: number | null;
  thumbnail_height: number | null;
  published_at: string;
  view_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  duration_iso: string | null;
};

type TrackedCompetitorRow = {
  id: string;
  list_id: string;
  youtube_id: string;
  uploads_playlist_id: string | null;
  videos_synced_at: string | null;
};

function calculateVPH(viewCount: number, publishedAt: string): number {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const hoursElapsed = Math.max(
    1,
    Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60))
  );
  return Math.round(viewCount / hoursElapsed);
}

function formatYoutubeItem(item: Record<string, unknown>): Omit<StoredCompetitorVideoRow, 'id' | 'tracked_competitor_id' | 'list_id'> {
  const snippet = item.snippet as Record<string, unknown> | undefined;
  const statistics = (item.statistics as Record<string, unknown>) ?? {};
  const contentDetails = (item.contentDetails as Record<string, unknown>) ?? {};
  const thumbs = snippet?.thumbnails as Record<string, unknown> | undefined;
  const picked = pickThumbnailFromYoutube(thumbs);
  const portraitDims = pickPortraitClassificationDims(thumbs);

  return {
    youtube_video_id: String(item.id),
    youtube_channel_id: String(snippet?.channelId ?? ''),
    title: String(snippet?.title ?? ''),
    description: String(snippet?.description ?? ''),
    thumbnail_url: picked.url || null,
    thumbnail_width: portraitDims?.width ?? picked.width ?? null,
    thumbnail_height: portraitDims?.height ?? picked.height ?? null,
    published_at: new Date(String(snippet?.publishedAt ?? Date.now())).toISOString(),
    view_count: parseInt(String(statistics.viewCount ?? '0'), 10) || 0,
    like_count: parseInt(String(statistics.likeCount ?? '0'), 10) || 0,
    comment_count: parseInt(String(statistics.commentCount ?? '0'), 10) || 0,
    duration_iso: (contentDetails.duration as string | undefined) ?? null,
  };
}

export function storedRowToVideo(row: StoredCompetitorVideoRow): Video {
  const publishedAt = new Date(row.published_at);
  const viewCount = row.view_count ?? 0;
  return {
    id: row.youtube_video_id,
    youtubeId: row.youtube_video_id,
    channelId: row.youtube_channel_id,
    title: row.title,
    description: row.description ?? '',
    thumbnailUrl: row.thumbnail_url ?? '',
    thumbnailWidth: row.thumbnail_width,
    thumbnailHeight: row.thumbnail_height,
    publishedAt,
    viewCount,
    likeCount: row.like_count ?? 0,
    commentCount: row.comment_count ?? 0,
    vph: calculateVPH(viewCount, row.published_at),
    durationIso: row.duration_iso,
  };
}

async function resolveUploadsPlaylistId(
  admin: SupabaseClient,
  competitor: TrackedCompetitorRow,
  ctx: YouTubeFetchContext
): Promise<string | null> {
  if (competitor.uploads_playlist_id) return competitor.uploads_playlist_id;

  const result = await fetchYouTubeApiData(
    'channels',
    { part: 'contentDetails', id: competitor.youtube_id },
    ctx
  );

  if (!result.ok) return null;

  const items = (result.data as { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> })
    ?.items;
  const playlistId = items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!playlistId) return null;

  await admin
    .from('tracked_competitors')
    .update({ uploads_playlist_id: playlistId })
    .eq('id', competitor.id);

  return playlistId;
}

async function fetchRecentPlaylistVideoIds(
  playlistId: string,
  maxResults: number,
  ctx: YouTubeFetchContext
): Promise<string[]> {
  const result = await fetchYouTubeApiData(
    'playlistItems',
    {
      part: 'snippet',
      playlistId,
      maxResults: String(maxResults),
    },
    ctx
  );

  if (!result.ok) return [];

  const items = (result.data as { items?: Array<{ snippet?: { resourceId?: { videoId?: string } } }> })
    ?.items;

  return (items ?? [])
    .map((item) => item.snippet?.resourceId?.videoId)
    .filter((id): id is string => Boolean(id));
}

async function fetchVideoDetailsByIds(
  videoIds: string[],
  ctx: YouTubeFetchContext
): Promise<ReturnType<typeof formatYoutubeItem>[]> {
  if (!videoIds.length) return [];

  const result = await fetchYouTubeApiData(
    'videos',
    {
      part: 'snippet,statistics,contentDetails',
      id: videoIds.join(','),
    },
    ctx
  );

  if (!result.ok) return [];

  const items = (result.data as { items?: Record<string, unknown>[] })?.items ?? [];
  return items.map((item) => formatYoutubeItem(item));
}

export async function loadStoredCompetitorVideos(
  admin: SupabaseClient,
  listId: string
): Promise<StoredCompetitorVideoRow[]> {
  const { data, error } = await admin
    .from('tracked_competitor_videos')
    .select('*')
    .eq('list_id', listId)
    .order('published_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as StoredCompetitorVideoRow[];
}

export async function syncCompetitorChannelVideos(
  admin: SupabaseClient,
  userId: string,
  competitor: TrackedCompetitorRow,
  ctx: YouTubeFetchContext,
  options: { force?: boolean } = {}
): Promise<{ newCount: number; apiSkipped: boolean }> {
  const syncedAt = competitor.videos_synced_at
    ? new Date(competitor.videos_synced_at).getTime()
    : 0;
  const recentlySynced =
    !options.force &&
    syncedAt > 0 &&
    Date.now() - syncedAt < COMPETITOR_VIDEO_SYNC_INTERVAL_MS;

  if (recentlySynced) {
    return { newCount: 0, apiSkipped: true };
  }

  const { data: existingRows, error: existingError } = await admin
    .from('tracked_competitor_videos')
    .select('youtube_video_id')
    .eq('tracked_competitor_id', competitor.id);

  if (existingError) throw new Error(existingError.message);

  const existingIds = new Set(
    (existingRows ?? []).map((r) => r.youtube_video_id as string)
  );

  const playlistId = await resolveUploadsPlaylistId(admin, competitor, ctx);
  if (!playlistId) {
    return { newCount: 0, apiSkipped: true };
  }

  const playlistVideoIds = await fetchRecentPlaylistVideoIds(
    playlistId,
    COMPETITOR_VIDEOS_PER_CHANNEL,
    ctx
  );

  const newIds = playlistVideoIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    const details = await fetchVideoDetailsByIds(newIds, ctx);
    const now = new Date().toISOString();

    const rows = details.map((video) => ({
      user_id: userId,
      list_id: competitor.list_id,
      tracked_competitor_id: competitor.id,
      ...video,
      updated_at: now,
    }));

    if (rows.length > 0) {
      const { error: upsertError } = await admin
        .from('tracked_competitor_videos')
        .upsert(rows, { onConflict: 'tracked_competitor_id,youtube_video_id' });

      if (upsertError) throw new Error(upsertError.message);
    }
  }

  await admin
    .from('tracked_competitors')
    .update({ videos_synced_at: new Date().toISOString() })
    .eq('id', competitor.id);

  return { newCount: newIds.length, apiSkipped: false };
}

export async function syncCompetitorListVideos(
  admin: SupabaseClient,
  userId: string,
  listId: string,
  options: { force?: boolean } = {}
): Promise<{ videos: Video[]; newVideos: number; apiCallsSkipped: boolean }> {
  const { data: list, error: listError } = await admin
    .from('competitor_lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  if (listError) throw new Error(listError.message);
  if (!list) throw new Error('List not found');

  const { data: competitors, error: competitorsError } = await admin
    .from('tracked_competitors')
    .select('id, list_id, youtube_id, uploads_playlist_id, videos_synced_at')
    .eq('list_id', listId);

  if (competitorsError) throw new Error(competitorsError.message);

  const ctx: YouTubeFetchContext = {
    userId,
    rateLimitKey: userId,
    limiterId: 'sync-videos',
  };

  let totalNew = 0;
  let allSkipped = true;

  for (const competitor of (competitors ?? []) as TrackedCompetitorRow[]) {
    const result = await syncCompetitorChannelVideos(admin, userId, competitor, ctx, options);
    totalNew += result.newCount;
    if (!result.apiSkipped) allSkipped = false;
  }

  const stored = await loadStoredCompetitorVideos(admin, listId);
  const videos = stored.map(storedRowToVideo);

  return {
    videos,
    newVideos: totalNew,
    apiCallsSkipped: allSkipped,
  };
}
