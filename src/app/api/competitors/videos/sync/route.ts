import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-auth';
import { createAdminClient } from '@/utils/supabase/server';
import {
  loadStoredCompetitorVideos,
  storedRowToVideo,
  syncCompetitorListVideos,
} from '@/lib/competitor-video-sync';

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const listId = request.nextUrl.searchParams.get('listId');
    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const stored = await loadStoredCompetitorVideos(admin, listId);

    return NextResponse.json({
      videos: stored.map(storedRowToVideo),
      source: 'database',
    });
  } catch (error) {
    console.error('competitor videos cache read failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load videos' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getRequestUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const listId = body?.listId as string | undefined;
    const force = Boolean(body?.force);

    if (!listId) {
      return NextResponse.json({ error: 'listId is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    const result = await syncCompetitorListVideos(admin, user.id, listId, { force });

    return NextResponse.json({
      videos: result.videos,
      newVideos: result.newVideos,
      apiCallsSkipped: result.apiCallsSkipped,
      source: 'sync',
    });
  } catch (error) {
    console.error('competitor videos sync failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
