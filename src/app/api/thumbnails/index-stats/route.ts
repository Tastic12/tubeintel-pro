import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { getThumbnailUser } from '@/lib/thumbnail-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getThumbnailUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin.rpc('thumbnail_index_stats', { user_uuid: user.id });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bySource = (data || []) as Array<{
      source: string;
      total: number;
      indexed: number;
      pending: number;
    }>;

    const totals = bySource.reduce(
      (acc, row) => ({
        total: acc.total + Number(row.total),
        indexed: acc.indexed + Number(row.indexed),
        pending: acc.pending + Number(row.pending),
      }),
      { total: 0, indexed: 0, pending: 0 }
    );

    return NextResponse.json({ bySource, totals });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
