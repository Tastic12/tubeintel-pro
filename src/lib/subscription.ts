import { fetchSubscriptionStatus } from '@/lib/subscription-status-client';

export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionData {
  plan_type: SubscriptionTier;
  status: string;
  current_period_end?: string;
  created_at?: string;
}

export const checkSubscriptionStatus = async (): Promise<SubscriptionData> => {
  const data = await fetchSubscriptionStatus();

  if (data.subscribed && data.subscription) {
    return {
      plan_type: data.plan,
      status: data.subscription.status,
      current_period_end: data.subscription.currentPeriodEnd,
    };
  }

  return {
    plan_type: 'free',
    status: 'none',
  };
};

export const hasActiveSubscription = async (): Promise<boolean> => {
  const subscription = await checkSubscriptionStatus();
  return subscription.plan_type === 'pro' && subscription.status === 'active';
};

export const getSubscriptionTier = async (): Promise<SubscriptionTier> => {
  const subscription = await checkSubscriptionStatus();
  return subscription.plan_type;
};
