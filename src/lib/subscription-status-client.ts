import type { SubscriptionPlan } from '@/lib/subscription-limits';
import { ensureAuthReady } from '@/lib/auth-session';

export type SubscriptionStatusResponse = {
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

export async function fetchSubscriptionStatus(): Promise<SubscriptionStatusResponse> {
  await ensureAuthReady();

  const response = await fetch('/api/subscription/status', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (response.status === 401) {
    return { subscribed: false, plan: 'free', subscription: null };
  }

  if (!response.ok) {
    throw new Error(`Subscription status request failed: ${response.status}`);
  }

  return response.json();
}
