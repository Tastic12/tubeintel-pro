import { NextRequest, NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/request-auth';
import { getSubscriptionStatusForUser } from '@/lib/subscription-status-server';

export const dynamic = 'force-dynamic';

/** @deprecated Use GET /api/subscription/status */
export async function GET(_req: NextRequest) {
  try {
    const requestUser = await getRequestUser();
    if (!requestUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const status = await getSubscriptionStatusForUser(requestUser.id);

    return NextResponse.json({
      success: true,
      subscription: {
        plan_type: status.plan,
        status: status.subscribed ? 'active' : 'none',
        current_period_end: status.subscription?.currentPeriodEnd,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An error occurred';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
