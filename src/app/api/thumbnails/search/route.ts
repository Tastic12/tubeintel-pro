import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { embedText, embeddingToPgvectorText } from '@/lib/embeddings';
import { getThumbnailUser } from '@/lib/thumbnail-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await getThumbnailUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rl = await checkRateLimit(user.id, 'thumbnail-search');
    if (!rl.ok) {
      return NextResponse.json({ error: rl.message }, { status: rl.status });
    }

    const body = await request.json().catch(() => ({}));
    const query = (body?.query as string | undefined)?.trim();
    const matchCount = Math.min(Math.max(Number(body?.match_count) || 24, 4), 60);

    if (!query) {
      return NextResponse.json({ error: 'query is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const vec = await embedText(query);
    const { data, error } = await admin.rpc('search_thumbnails', {
      user_uuid: user.id,
      query_embedding: embeddingToPgvectorText(vec),
      match_count: matchCount,
    });

    if (error) {
      return NextResponse.json({ error: `Search failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, query, results: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
