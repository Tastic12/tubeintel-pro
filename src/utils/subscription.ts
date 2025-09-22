import { supabase } from '@/lib/supabase';

export type SubscriptionStatus = 'free' | 'pro';

export interface UserSubscription {
  status: 'active' | 'canceled' | 'past_due' | 'incomplete' | 'incomplete_expired' | 'trialing';
  plan_type: SubscriptionStatus;
  current_period_end: string;
  created_at: string;
  is_active?: boolean;
}

export interface SubscriptionResponse {
  authenticated: boolean;
  subscription: UserSubscription | null;
  error?: string;
}

/**
 * Get the current user's subscription status
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  if (!userId) {
    console.error('getUserSubscription: No user ID provided');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) {
      console.error('Error fetching subscription:', error);
      return null;
    }
    
    if (!data) return null;
    
    // Ensure the data has all required fields
    if (
      'status' in data && 
      'plan_type' in data && 
      'current_period_end' in data &&
      'created_at' in data
    ) {
      // First convert to unknown, then to UserSubscription
      return data as unknown as UserSubscription;
    }
    
    console.error('Subscription data missing required fields:', data);
    return null;
  } catch (error) {
    console.error('Error in getUserSubscription:', error);
    return null;
  }
}

/**
 * Check the current user's subscription status using the API
 */
export async function checkSubscription(): Promise<SubscriptionResponse> {
  try {
    const response = await fetch('/api/check-subscription');
    
    if (!response.ok) {
      // If we get a 401, user is not authenticated
      if (response.status === 401) {
        return { 
          authenticated: false, 
          subscription: null 
        };
      }
      
      throw new Error(`Failed to check subscription: ${response.status}`);
    }
    
    const result = await response.json();
    return result as SubscriptionResponse;
  } catch (error) {
    console.error('Error checking subscription:', error);
    return { 
      authenticated: false, 
      subscription: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Get subscription status from localStorage
 * Note: This is less secure and can be manipulated by users
 * Use checkSubscription() for server-validated status
 */
export function getLocalSubscription(): SubscriptionStatus {
  if (typeof window === 'undefined') return 'free';
  
  try {
    const subscription = localStorage.getItem('subscription') as SubscriptionStatus;
    return subscription || 'free';
  } catch (error) {
    console.error('Error reading subscription from localStorage:', error);
    return 'free';
  }
}

/**
 * Check if the user has an active subscription
 */
export function hasActiveSubscription(subscription: UserSubscription | null): boolean {
  if (!subscription) return false;
  
  // If we have the is_active flag already calculated, use it
  if (typeof subscription.is_active === 'boolean') {
    return subscription.is_active;
  }
  
  // Otherwise calculate it
  if (subscription.status !== 'active') return false;
  
  // Check if subscription has expired
  if (subscription.current_period_end) {
    const periodEnd = new Date(subscription.current_period_end);
    const now = new Date();
    return periodEnd > now;
  }
  
  return false;
}

/**
 * Get user subscription plan type
 */
export function getUserPlanType(subscription: UserSubscription | null): SubscriptionStatus {
  if (!subscription || !hasActiveSubscription(subscription)) {
    return 'free';
  }
  
  return subscription.plan_type;
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(
  planType: SubscriptionStatus | null,
  feature: 'basic' | 'pro',
  userId?: string
): boolean {
  // If no plan type, default to free
  if (!planType) {
    planType = 'free';
  }

  switch (feature) {
    case 'basic':
      // All users have access to basic features
      return true;
    case 'pro':
      // Pro and Pro+ users have access to pro features
      return planType === 'pro';
    default:
      return false;
  }
} 