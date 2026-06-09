import { NextRequest, NextResponse } from 'next/server';
import { isAdminEmail } from '@/lib/admin';
import { blockDebugApiInProduction } from '@/lib/api-security';
import { getRequestUser } from '@/lib/request-auth';
import { getActiveSubscription } from '@/lib/subscription-server';
import { getServiceAdmin } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const blocked = blockDebugApiInProduction(req.nextUrl.pathname);
  if (blocked) return blocked;

  try {
    const requestUser = await getRequestUser();
    if (!requestUser?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdminEmail(requestUser.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUserId = req.nextUrl.searchParams.get('user_id') || requestUser.id;
    const admin = getServiceAdmin();
    const subscription = await getActiveSubscription(targetUserId, admin);

    const { data: latestRow } = await admin
      .from('user_subscriptions')
      .select('plan_type, status, current_period_end, stripe_subscription_id, updated_at')
      .eq('user_id', targetUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      user_id: targetUserId,
      active: subscription
        ? {
            plan: subscription.plan_type,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          }
        : null,
      latest: latestRow ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
