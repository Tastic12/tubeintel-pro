import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { getRequestUser } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const requestUser = await getRequestUser();
    if (!requestUser) {
      return NextResponse.json(
        {
          authenticated: false,
          hasUpgrades: false,
          message: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: events, error } = await admin
      .from('subscription_events')
      .select('*')
      .eq('user_id', requestUser.id)
      .eq('event_type', 'upgrade')
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({
        authenticated: true,
        hasUpgrades: false,
        error: 'Failed to check for subscription upgrades',
      });
    }

    return NextResponse.json({
      authenticated: true,
      hasUpgrades: Boolean(events?.length),
      events: events ?? [],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      {
        authenticated: false,
        hasUpgrades: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
