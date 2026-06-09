import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { requireThumbnailProUser } from '@/lib/thumbnail-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireThumbnailProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const admin = createAdminClient();
    const { data, error } = await admin.rpc('pending_thumbnail_embeddings_count', {
      user_uuid: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ count: typeof data === 'number' ? data : 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
