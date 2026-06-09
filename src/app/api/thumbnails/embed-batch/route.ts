import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { runThumbnailEmbedBatch } from '@/lib/thumbnail-embed-service';
import { requireThumbnailProUser } from '@/lib/thumbnail-auth';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const auth = await requireThumbnailProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const admin = createAdminClient();
    const result = await runThumbnailEmbedBatch(admin, user.id);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      remaining: result.remaining,
      errors: result.errors,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
