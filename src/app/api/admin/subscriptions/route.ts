import { NextRequest, NextResponse } from 'next/server';
import { getServiceAdmin, isAdminEmail } from '@/lib/admin';
import { getRequestUser } from '@/lib/request-auth';
import {
  findUserIdByEmail,
  getActiveSubscription,
  upsertUserSubscription,
} from '@/lib/subscription-server';
import type { SubscriptionPlan } from '@/lib/subscription-limits';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
  const requestUser = await getRequestUser();
  if (!requestUser?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  if (!isAdminEmail(requestUser.email)) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { adminEmail: requestUser.email };
}

export async function GET(request: NextRequest) {
  try {
    const gate = await requireAdmin();
    if ('error' in gate) return gate.error;

    const email = request.nextUrl.searchParams.get('email')?.trim();
    if (!email) {
      return NextResponse.json({ error: 'email query parameter is required' }, { status: 400 });
    }

    const admin = getServiceAdmin();
    const user = await findUserIdByEmail(admin, email);
    if (!user) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });
    }

    const subscription = await getActiveSubscription(user.id, admin);
    const { data: latestRow } = await admin
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json({
      user,
      active: subscription
        ? {
            plan: subscription.plan_type,
            status: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
            stripeSubscriptionId: subscription.stripe_subscription_id,
          }
        : null,
      latest: latestRow ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const gate = await requireAdmin();
    if ('error' in gate) return gate.error;

    const body = await request.json().catch(() => ({}));
    const email = (body.email as string | undefined)?.trim();
    const planType = (body.plan_type as SubscriptionPlan | undefined) ?? 'pro';
    const periodDays = Number(body.period_days) || 30;

    if (!email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    if (planType !== 'free' && planType !== 'pro') {
      return NextResponse.json({ error: 'plan_type must be free or pro' }, { status: 400 });
    }

    const admin = getServiceAdmin();
    const user = await findUserIdByEmail(admin, email);
    if (!user) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });
    }

    const subscription = await upsertUserSubscription(admin, {
      userId: user.id,
      planType,
      periodDays: planType === 'pro' ? periodDays : undefined,
      note: `manual by ${gate.adminEmail}`,
    });

    return NextResponse.json({
      success: true,
      message:
        planType === 'pro'
          ? `Granted Pro for ${periodDays} days`
          : 'Subscription revoked — user is on Free',
      user,
      subscription: {
        plan: subscription.plan_type,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
