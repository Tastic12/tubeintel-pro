import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-auth';
import { createAdminClient } from '@/utils/supabase/server';
import { classifyAsShort } from '@/lib/classify-short';

type SyncVideoInput = {
  youtubeVideoId: string;
  viewCount: number;
  publishedAt?: string | Date | null;
  durationIso?: string | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

function toIsoTimestamp(value?: string | Date | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const youtubeChannelId = body?.youtubeChannelId as string | undefined;
    const videos = (body?.videos ?? []) as SyncVideoInput[];

    if (!youtubeChannelId || !Array.isArray(videos) || videos.length === 0) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: profile } = await admin
      .from('profiles')
      .select('youtube_channel_id')
      .eq('id', user.id)
      .maybeSingle();

    const source =
      profile?.youtube_channel_id === youtubeChannelId ? 'own' : 'competitor';

    const rows = videos
      .filter((v) => v?.youtubeVideoId)
      .map((v) => ({
        user_id: user.id,
        youtube_video_id: v.youtubeVideoId,
        youtube_channel_id: youtubeChannelId,
        view_count: Math.max(0, Number(v.viewCount) || 0),
        published_at: toIsoTimestamp(v.publishedAt),
        duration_iso: v.durationIso ?? null,
        is_short: classifyAsShort({
          durationIso: v.durationIso,
          thumbnailWidth: v.thumbnailWidth,
          thumbnailHeight: v.thumbnailHeight,
        }),
        source,
        updated_at: new Date().toISOString(),
      }));

    if (rows.length === 0) {
      return NextResponse.json({ scores: {} });
    }

    const { error: upsertError } = await admin
      .from('video_outlier_cache')
      .upsert(rows, { onConflict: 'user_id,youtube_video_id' });

    if (upsertError) {
      console.error('video_outlier_cache upsert failed:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    await admin.rpc('recompute_outlier_scores_v2', {
      p_user_id: user.id,
      p_youtube_channel_id: youtubeChannelId,
    });

    await admin.rpc('recompute_niche_outlier_scores_v2', {
      p_user_id: user.id,
    });

    const videoIds = rows.map((r) => r.youtube_video_id);
    const { data: cached, error: readError } = await admin
      .from('video_outlier_cache')
      .select('youtube_video_id, outlier_score, view_count')
      .eq('user_id', user.id)
      .in('youtube_video_id', videoIds);

    if (readError) {
      console.error('video_outlier_cache read failed:', readError);
      return NextResponse.json({ scores: {} });
    }

    const scores: Record<
      string,
      { outlierScore: number | null; medianViews: number | null }
    > = {};

    for (const row of cached ?? []) {
      const score = row.outlier_score != null ? Number(row.outlier_score) : null;
      const medianViews =
        score != null && score > 0
          ? Math.round(Number(row.view_count) / score)
          : null;
      scores[row.youtube_video_id] = {
        outlierScore: score,
        medianViews,
      };
    }

    return NextResponse.json({ scores });
  } catch (error) {
    console.error('Outlier sync error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
