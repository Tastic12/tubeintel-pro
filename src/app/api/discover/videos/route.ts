import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { normalizeDiscoverCategoryIds, normalizeDiscoverRegion } from '@/lib/youtube-discover';
import { requireDiscoverProUser } from '@/lib/discover-auth';
import { classifyAsShort } from '@/lib/classify-short';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireDiscoverProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const url = new URL(request.url);
    const categoryFilter = url.searchParams.get('category_id');
    const longFormOnly = url.searchParams.get('long_form_only') === '1';
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 100, 12), 200);

    const admin = createAdminClient();

    const { data: settings } = await admin
      .from('user_discover_settings')
      .select('region_code, category_ids')
      .eq('user_id', user.id)
      .maybeSingle();

    const regionCode = normalizeDiscoverRegion(settings?.region_code);
    const categoryIds = normalizeDiscoverCategoryIds(settings?.category_ids);

    let query = admin
      .from('discovered_videos')
      .select(
        'id, video_id, title, thumbnail_url, thumbnail_width, thumbnail_height, channel_id, channel_name, category_id, region_code, published_at, duration, view_count, like_count, is_short, last_seen_at'
      )
      .eq('region_code', regionCode)
      .order('view_count', { ascending: false })
      .limit(500);

    if (categoryFilter) {
      query = query.eq('category_id', Number(categoryFilter));
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allRows = data ?? [];
    const rowIsShort = (row: (typeof allRows)[number]) =>
      classifyAsShort({
        durationIso: row.duration,
        thumbnailWidth: row.thumbnail_width,
        thumbnailHeight: row.thumbnail_height,
      });

    const eligibleRows = longFormOnly ? allRows.filter((row) => !rowIsShort(row)) : allRows;

    const byVideo = new Map<string, (typeof allRows)[number]>();
    for (const row of eligibleRows) {
      const existing = byVideo.get(row.video_id);
      if (!existing || (row.view_count ?? 0) > (existing.view_count ?? 0)) {
        byVideo.set(row.video_id, row);
      }
    }

    const deduped = Array.from(byVideo.values())
      .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, limit);

    const shortsInPool = allRows.filter((row) => rowIsShort(row)).length;
    const longFormInPool = allRows.length - shortsInPool;

    return NextResponse.json({
      videos: deduped,
      region_code: regionCode,
      category_ids: categoryIds,
      stats: {
        rows_in_db: allRows.length,
        unique_videos: new Set(allRows.map((row) => row.video_id)).size,
        showing: deduped.length,
        shorts_in_pool: shortsInPool,
        long_form_in_pool: longFormInPool,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
