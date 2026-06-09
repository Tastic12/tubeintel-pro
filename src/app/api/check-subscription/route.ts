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
        {
          authenticated: false,
          subscription: null,
          message: 'Not authenticated',
        },
        { status: 401 }
      );
    }

    const status = await getSubscriptionStatusForUser(requestUser.id);

    if (!status.subscribed || !status.subscription) {
      return NextResponse.json({
        authenticated: true,
        subscription: {
          plan_type: 'free',
          status: 'active',
          is_active: false,
        },
      });
    }

    return NextResponse.json({
      authenticated: true,
      subscription: {
        plan_type: status.subscription.planType,
        status: status.subscription.status,
        current_period_end: status.subscription.currentPeriodEnd,
        is_active: true,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to check subscription status';
    return NextResponse.json(
      {
        authenticated: false,
        subscription: null,
        error: message,
      },
      { status: 500 }
    );
  }
}
