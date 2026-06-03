import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { runThumbnailEmbedCron } from '@/lib/thumbnail-embed-service';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // Local dev: allow when unset (same pattern as rate-limit no-op)
    return process.env.NODE_ENV === 'development';
  }

  const auth = request.headers.get('authorization');
  return auth === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const maxBatches = Math.min(
      Math.max(Number(new URL(request.url).searchParams.get('max_batches')) || 4, 1),
      10
    );

    const result = await runThumbnailEmbedCron(admin, maxBatches);

    return NextResponse.json({
      success: true,
      ...result,
      message: `Embedded ${result.totalProcessed} thumbnails in ${result.batches} batch(es). ${result.remaining} remaining.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[cron/thumbnail-embed]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
