import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { embedImageFromBuffer, embeddingToPgvectorText } from '@/lib/embeddings';
import { getThumbnailUser } from '@/lib/thumbnail-auth';
import { checkRateLimit } from '@/lib/rate-limit';

export const maxDuration = 60;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

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

    const form = await request.formData();
    const file = form.get('image');
    const matchCount = Math.min(Math.max(Number(form.get('match_count')) || 24, 4), 60);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Image upload (field "image") is required.' }, { status: 400 });
    }
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Uploaded file is not an image.' }, { status: 400 });
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 8 MB).' }, { status: 400 });
    }

    const admin = createAdminClient();
    const buffer = await file.arrayBuffer();
    const vec = await embedImageFromBuffer(buffer, file.type || 'image/jpeg');

    const { data: stats } = await admin.rpc('thumbnail_index_stats', { user_uuid: user.id });
    const indexedTotal = ((stats || []) as Array<{ indexed: number }>).reduce(
      (sum, row) => sum + Number(row.indexed),
      0
    );
    if (indexedTotal === 0) {
      return NextResponse.json(
        {
          error:
            'No thumbnails indexed yet. Wait for auto-indexing or click Embed pending on the Thumbnails page.',
          results: [],
        },
        { status: 422 }
      );
    }

    const { data, error } = await admin.rpc('search_thumbnails', {
      user_uuid: user.id,
      query_embedding: embeddingToPgvectorText(vec),
      match_count: matchCount,
    });

    if (error) {
      return NextResponse.json({ error: `Search failed: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, results: data || [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
