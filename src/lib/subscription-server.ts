import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/utils/supabase/server';
import { hasProAccess, type SubscriptionPlan } from '@/lib/subscription-limits';

export type UserSubscriptionRow = {
  id: string;
  user_id: string;
  plan_type: SubscriptionPlan;
  status: string;
  current_period_end: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export async function getActiveSubscription(
  userId: string,
  admin?: SupabaseClient
): Promise<UserSubscriptionRow | null> {
  const client = admin ?? createAdminClient();
  const { data, error } = await client
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const expiry = new Date(data.current_period_end);
  if (expiry < new Date()) return null;

  return data as UserSubscriptionRow;
}

export async function userHasProAccess(userId: string): Promise<boolean> {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return false;
  return hasProAccess(subscription.plan_type, true);
}

export function proFeatureForbiddenResponse() {
  return NextResponse.json(
    {
      error: 'Pro subscription required',
      code: 'PRO_REQUIRED',
      message: 'Upgrade to Pro to access this feature.',
    },
    { status: 403 }
  );
}

export async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<{ id: string; email: string; username?: string | null } | null> {
  const normalized = email.trim().toLowerCase();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, email, username')
    .ilike('email', normalized)
    .maybeSingle();

  if (profile?.id && profile.email) {
    return {
      id: profile.id,
      email: profile.email,
      username: profile.username,
    };
  }

  const { data: authData, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (error) return null;

  const match = authData.users.find(
    (user) => user.email?.toLowerCase() === normalized
  );
  if (!match?.id || !match.email) return null;

  return { id: match.id, email: match.email };
}

export async function upsertUserSubscription(
  admin: SupabaseClient,
  opts: {
    userId: string;
    planType: SubscriptionPlan;
    periodDays?: number;
    note?: string;
  }
): Promise<UserSubscriptionRow> {
  const now = new Date();
  const periodDays = opts.periodDays ?? 30;

  if (opts.planType === 'free') {
    const { data: existing } = await admin
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', opts.userId)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await admin
        .from('user_subscriptions')
        .update({
          plan_type: 'free',
          status: 'canceled',
          current_period_end: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq('user_id', opts.userId)
        .select('*')
        .single();

      if (error) throw error;
      return data as UserSubscriptionRow;
    }

    const expiry = new Date(now);
    expiry.setDate(expiry.getDate() - 1);

    const { data, error } = await admin
      .from('user_subscriptions')
      .insert({
        user_id: opts.userId,
        plan_type: 'free',
        status: 'canceled',
        current_period_end: expiry.toISOString(),
        stripe_customer_id: null,
        stripe_subscription_id: null,
      })
      .select('*')
      .single();

    if (error) throw error;
    return data as UserSubscriptionRow;
  }

  const expiry = new Date(now);
  expiry.setDate(expiry.getDate() + periodDays);

  const { data: existing } = await admin
    .from('user_subscriptions')
    .select('id, stripe_customer_id, stripe_subscription_id')
    .eq('user_id', opts.userId)
    .maybeSingle();

  const manualStripeId = existing?.stripe_subscription_id?.startsWith('manual_')
    ? existing.stripe_subscription_id
    : `manual_${opts.userId.slice(0, 8)}_${Date.now()}`;

  const payload = {
    user_id: opts.userId,
    plan_type: 'pro' as const,
    status: 'active' as const,
    current_period_end: expiry.toISOString(),
    stripe_customer_id: existing?.stripe_customer_id ?? `manual_cus_${opts.userId.slice(0, 8)}`,
    stripe_subscription_id: existing?.stripe_subscription_id?.startsWith('sub_')
      ? existing.stripe_subscription_id
      : manualStripeId,
    updated_at: now.toISOString(),
  };

  if (existing?.id) {
    const { data, error } = await admin
      .from('user_subscriptions')
      .update(payload)
      .eq('user_id', opts.userId)
      .select('*')
      .single();

    if (error) throw error;
    return data as UserSubscriptionRow;
  }

  const { data, error } = await admin
    .from('user_subscriptions')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;
  return data as UserSubscriptionRow;
}
