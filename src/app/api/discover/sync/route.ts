import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { upsertDiscoveredVideos } from '@/lib/discover-db';
import { checkRateLimit } from '@/lib/rate-limit';
import { logYoutubeApiUsage, getServiceAdmin } from '@/lib/admin';
import {
  DEFAULT_DISCOVER_CATEGORY_IDS,
  fetchTrendingBatch,
  normalizeDiscoverCategoryIds,
  normalizeDiscoverRegion,
} from '@/lib/youtube-discover';
import { getDiscoverUser, unauthorizedDiscoverResponse } from '@/lib/discover-auth';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getDiscoverUser(request);
    if (!user) return unauthorizedDiscoverResponse();

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      return NextResponse.json({ error: 'YouTube API key is not configured' }, { status: 500 });
    }

    const rl = await checkRateLimit(user.id, 'discover-sync');
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const admin = createAdminClient();

    const { data: settings } = await admin
      .from('user_discover_settings')
      .select('region_code, category_ids')
      .eq('user_id', user.id)
      .maybeSingle();

    const regionCode = normalizeDiscoverRegion(settings?.region_code);
    const categoryIds = normalizeDiscoverCategoryIds(settings?.category_ids);

    const { records, apiCalls, errors } = await fetchTrendingBatch(
      youtubeApiKey,
      regionCode,
      categoryIds
    );

    const saved = await upsertDiscoveredVideos(admin, records);

    try {
      const usageAdmin = getServiceAdmin();
      await logYoutubeApiUsage(usageAdmin, {
        userId: user.id,
        endpoint: 'discover/sync',
        units: apiCalls,
      });
    } catch {
      // optional logging
    }

    const uniqueVideos = new Set(records.map((r) => r.video_id)).size;

    return NextResponse.json({
      success: true,
      saved,
      unique_videos: uniqueVideos,
      fetched: records.length,
      api_calls: apiCalls,
      region_code: regionCode,
      category_ids: categoryIds,
      message: `Saved ${saved} rows (${uniqueVideos} unique videos) from ${apiCalls} API calls.`,
      errors: errors.length ? errors : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
