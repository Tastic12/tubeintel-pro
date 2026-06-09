import { NextRequest, NextResponse } from 'next/server';
import { getServiceAdmin, isAdminEmail } from '@/lib/admin';
import { blockDebugApiInProduction } from '@/lib/api-security';
import { getRequestUser } from '@/lib/request-auth';
import {
  findUserIdByEmail,
  upsertUserSubscription,
} from '@/lib/subscription-server';
import type { SubscriptionPlan } from '@/lib/subscription-limits';

/**
 * Legacy test endpoint — restricted to admins. Prefer /api/admin/subscriptions
 * or Stripe checkout for production upgrades.
 */
export async function POST(req: NextRequest) {
  const blocked = blockDebugApiInProduction(req.nextUrl.pathname);
  if (blocked) return blocked;

  try {
    const requestUser = await getRequestUser();
    if (!requestUser?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!isAdminEmail(requestUser.email)) {
      return NextResponse.json(
        {
          error: 'Forbidden',
          message: 'Use /dashboard/admin to manage subscriptions.',
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email = (body.email as string | undefined)?.trim() || requestUser.email;
    const planType = (body.plan_type as SubscriptionPlan | undefined) ?? 'pro';
    const periodDays = Number(body.period_days) || 30;

    const admin = getServiceAdmin();
    const user = await findUserIdByEmail(admin, email);
    if (!user) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });
    }

    const subscription = await upsertUserSubscription(admin, {
      userId: user.id,
      planType,
      periodDays: planType === 'pro' ? periodDays : undefined,
      note: `legacy set-pro by ${requestUser.email}`,
    });

    return NextResponse.json({
      success: true,
      message: `Subscription set to ${planType}`,
      user,
      subscription: {
        plan: subscription.plan_type,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
} 