import type { SupabaseClient } from '@supabase/supabase-js';
import type { TrendingVideoRecord } from './youtube-discover';

function dedupeTrendingRecords(records: TrendingVideoRecord[]): TrendingVideoRecord[] {
  const byKey = new Map<string, TrendingVideoRecord>();

  for (const record of records) {
    const key = `${record.video_id}|${record.region_code}|${record.category_id}`;
    const existing = byKey.get(key);
    if (!existing || record.view_count > existing.view_count) {
      byKey.set(key, record);
    }
  }

  return Array.from(byKey.values());
}

export async function upsertDiscoveredVideos(
  admin: SupabaseClient,
  records: TrendingVideoRecord[]
): Promise<number> {
  if (!records.length) return 0;

  const deduped = dedupeTrendingRecords(records);
  const now = new Date().toISOString();
  const rows = deduped.map((r) => ({
    video_id: r.video_id,
    title: r.title,
    thumbnail_url: r.thumbnail_url,
    thumbnail_width: r.thumbnail_width,
    thumbnail_height: r.thumbnail_height,
    channel_id: r.channel_id,
    channel_name: r.channel_name,
    category_id: r.category_id,
    region_code: r.region_code,
    published_at: r.published_at,
    duration: r.duration,
    view_count: r.view_count,
    like_count: r.like_count,
    last_seen_at: now,
  }));

  const { error } = await admin.from('discovered_videos').upsert(rows, {
    onConflict: 'video_id,region_code,category_id',
  });

  if (error) {
    throw new Error(`Failed to save discovered videos: ${error.message}`);
  }

  return rows.length;
}
