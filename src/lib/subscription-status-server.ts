import { createAdminClient } from '@/utils/supabase/server';
import type { SubscriptionPlan } from '@/lib/subscription-limits';

export type SubscriptionStatusPayload = {
  subscribed: boolean;
  plan: SubscriptionPlan;
  subscription: {
    id: string;
    planType: SubscriptionPlan;
    status: string;
    currentPeriodEnd: string;
  } | null;
  message?: string;
};

export async function getSubscriptionStatusForUser(
  userId: string
): Promise<SubscriptionStatusPayload> {
  const admin = createAdminClient();
  const { data: subscription, error } = await admin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !subscription) {
    return {
      subscribed: false,
      plan: 'free',
      subscription: null,
      message: 'No active subscription found',
    };
  }

  const expiryDate = new Date(subscription.current_period_end);
  if (expiryDate < new Date()) {
    return {
      subscribed: false,
      plan: 'free',
      subscription: null,
      message: 'Subscription expired',
    };
  }

  const plan = subscription.plan_type as SubscriptionPlan;

  return {
    subscribed: plan === 'pro',
    plan,
    subscription: {
      id: subscription.id,
      planType: plan,
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    },
  };
}
