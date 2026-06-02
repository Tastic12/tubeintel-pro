import { Video } from '@/types';

/**
 * Sync video metrics to Postgres and merge SQL-computed outlier scores.
 * Failures are silent — callers keep client-side fallback scoring.
 */
export async function attachSqlOutlierScores(
  videos: Video[],
  youtubeChannelId: string
): Promise<Video[]> {
  if (!videos.length || !youtubeChannelId) return videos;

  try {
    const response = await fetch('/api/outliers/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        youtubeChannelId,
        videos: videos.map((v) => ({
          youtubeVideoId: v.youtubeId || v.id,
          viewCount: v.viewCount,
          publishedAt: v.publishedAt,
          durationIso: v.durationIso ?? null,
        })),
      }),
    });

    if (!response.ok) return videos;

    const payload = await response.json();
    const scores = (payload?.scores ?? {}) as Record<
      string,
      { outlierScore: number | null; medianViews: number | null }
    >;

    return videos.map((video) => {
      const key = video.youtubeId || video.id;
      const entry = scores[key];
      if (!entry?.outlierScore) return video;
      return {
        ...video,
        outlierScore: entry.outlierScore,
        outlierMedianViews: entry.medianViews,
      };
    });
  } catch {
    return videos;
  }
}
