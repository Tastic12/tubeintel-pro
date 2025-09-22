/**
 * Client-side utility functions for managing subscription data
 */

// Types for subscription data
export type SubscriptionTier = 'free' | 'pro';

interface SubscriptionData {
  plan_type: SubscriptionTier;
  status: string;
  current_period_end?: string;
  created_at?: string;
}

/**
 * Check the user's subscription status
 * This makes a server call to verify the actual subscription status
 */
export const checkSubscriptionStatus = async (): Promise<SubscriptionData> => {
  try {
    console.log('Checking subscription status from server...');
    
    // Call the server endpoint
    const response = await fetch('/api/subscription/check', {
      credentials: 'include',
      cache: 'no-store' // Don't cache this request
    });
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.success && data.subscription) {
      console.log('Retrieved subscription from server:', data.subscription.plan_type);
      
      // Update localStorage to match the server data
      localStorage.setItem('subscription', data.subscription.plan_type);
      
      return data.subscription;
    }
    
    // Fallback to client-side storage
    throw new Error('No subscription data in server response');
  } catch (error) {
    console.error('Error checking subscription status:', error);
    
    // Fallback to localStorage
    const planType = localStorage.getItem('subscription') as SubscriptionTier || 'free';
    console.log('Using cached subscription tier:', planType);
    
    // Return a basic subscription object based on the cached tier
    return {
      plan_type: planType,
      status: planType === 'free' ? 'none' : 'active'
    };
  }
};

/**
 * Check if the user has an active subscription
 * Returns true if the user has any active paid subscription (pro)
 */
export const hasActiveSubscription = async (): Promise<boolean> => {
  try {
    const subscription = await checkSubscriptionStatus();
    return subscription.plan_type !== 'free' && subscription.status === 'active';
  } catch (error) {
    console.error('Error checking if subscription is active:', error);
    // Fallback to localStorage in case of error
    const planType = localStorage.getItem('subscription') as SubscriptionTier || 'free';
    return planType !== 'free';
  }
};

/**
 * Get the current subscription tier
 * Returns 'free' if no subscription is found
 */
export const getSubscriptionTier = async (): Promise<SubscriptionTier> => {
  try {
    const subscription = await checkSubscriptionStatus();
    return subscription.plan_type;
  } catch (error) {
    console.error('Error getting subscription tier:', error);
    // Fallback to localStorage in case of error
    return localStorage.getItem('subscription') as SubscriptionTier || 'free';
  }
}; 