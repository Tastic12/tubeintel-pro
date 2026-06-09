import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { DEFAULT_DISCOVER_CATEGORY_IDS } from '@/lib/youtube-discover';
import { requireDiscoverProUser } from '@/lib/discover-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const auth = await requireDiscoverProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const admin = createAdminClient();

    const { data, error } = await admin
      .from('user_discover_settings')
      .select('region_code, category_ids')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      region_code: data?.region_code ?? 'GB',
      category_ids: data?.category_ids ?? [...DEFAULT_DISCOVER_CATEGORY_IDS],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireDiscoverProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const admin = createAdminClient();
    const body = await request.json().catch(() => ({}));
    const regionCode =
      typeof body.region_code === 'string' ? body.region_code.trim().toUpperCase() : 'GB';
    const categoryIds = Array.isArray(body.category_ids)
      ? body.category_ids.map(Number).filter((n: number) => Number.isFinite(n) && n > 0)
      : [...DEFAULT_DISCOVER_CATEGORY_IDS];

    if (!categoryIds.length) {
      return NextResponse.json({ error: 'Select at least one category.' }, { status: 400 });
    }

    const { data, error } = await admin
      .from('user_discover_settings')
      .upsert(
        {
          user_id: user.id,
          region_code: regionCode,
          category_ids: categoryIds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select('region_code, category_ids')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, settings: data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
