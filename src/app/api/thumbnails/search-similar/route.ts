import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { embeddingToPgvectorText } from '@/lib/embeddings';
import { requireThumbnailProUser } from '@/lib/thumbnail-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const auth = await requireThumbnailProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const rl = await checkRateLimit(user.id, 'thumbnail-search');
    if (!rl.ok) {
      return NextResponse.json({ error: rl.message }, { status: rl.status });
    }

    const body = await request.json().catch(() => ({}));
    const sourceVideoId = (body?.youtube_video_id as string | undefined)?.trim();
    const matchCount = Math.min(Math.max(Number(body?.match_count) || 24, 4), 60);

    if (!sourceVideoId) {
      return NextResponse.json({ error: 'youtube_video_id is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: source, error: sourceError } = await admin
      .from('thumbnail_embeddings')
      .select('embedding')
      .eq('youtube_video_id', sourceVideoId)
      .maybeSingle();

    if (sourceError) {
      return NextResponse.json({ error: sourceError.message }, { status: 500 });
    }
    if (!source?.embedding) {
      return NextResponse.json(
        { error: 'No embedding for that video yet — wait for indexing or refresh trending.' },
        { status: 404 }
      );
    }

    let queryText: string;
    if (typeof source.embedding === 'string') {
      queryText = source.embedding.startsWith('[') ? source.embedding : `[${source.embedding}]`;
    } else if (Array.isArray(source.embedding)) {
      queryText = embeddingToPgvectorText(source.embedding as number[]);
    } else {
      return NextResponse.json({ error: 'Stored embedding has unexpected shape.' }, { status: 500 });
    }

    const { data, error } = await admin.rpc('search_thumbnails', {
      user_uuid: user.id,
      query_embedding: queryText,
      match_count: matchCount + 1,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const filtered = ((data || []) as Array<{ youtube_video_id: string }>).filter(
      (r) => r.youtube_video_id !== sourceVideoId
    );

    return NextResponse.json({
      success: true,
      source_video_id: sourceVideoId,
      results: filtered.slice(0, matchCount),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
