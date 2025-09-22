import { apiCache, createCacheKey } from '@/lib/api-cache';

export type SubscriptionTier = 'free' | 'pro';

export interface SubscriptionData {
  plan_type: SubscriptionTier;
  status: 'none' | 'active' | 'cancelled' | 'past_due';
  currentPeriodEnd?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

class OptimizedSubscriptionService {
  private static instance: OptimizedSubscriptionService;
  private currentUserId: string | null = null;

  static getInstance(): OptimizedSubscriptionService {
    if (!OptimizedSubscriptionService.instance) {
      OptimizedSubscriptionService.instance = new OptimizedSubscriptionService();
    }
    return OptimizedSubscriptionService.instance;
  }

  /**
   * Get subscription status with intelligent caching
   */
  async getSubscriptionStatus(userId?: string): Promise<SubscriptionData> {
    const targetUserId = userId || await this.getCurrentUserId();
    if (!targetUserId) {
      return { plan_type: 'free', status: 'none' };
    }

    const cacheKey = createCacheKey('subscription', targetUserId);

    return apiCache.get(
      cacheKey,
      () => this.fetchSubscriptionFromAPI(targetUserId),
      'subscription'
    );
  }

  /**
   * Fetch subscription data from API
   */
  private async fetchSubscriptionFromAPI(userId: string): Promise<SubscriptionData> {
    try {
      const response = await fetch('/api/subscription/status', {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }

      const data = await response.json();

      if (data.subscribed && data.subscription) {
        return {
          plan_type: data.plan || data.subscription.plan_type || 'free',
          status: data.subscription.status || 'active',
          currentPeriodEnd: data.subscription.currentPeriodEnd,
          stripeCustomerId: data.subscription.stripeCustomerId,
          stripeSubscriptionId: data.subscription.stripeSubscriptionId
        };
      }

      return { plan_type: 'free', status: 'none' };
    } catch (error) {
      console.error('Error fetching subscription:', error);
      
      // Fallback to localStorage
      const cachedPlan = localStorage.getItem('subscription') as SubscriptionTier || 'free';
      return {
        plan_type: cachedPlan,
        status: cachedPlan === 'free' ? 'none' : 'active'
      };
    }
  }

  /**
   * Check if user has an active subscription (cached)
   */
  async hasActiveSubscription(userId?: string): Promise<boolean> {
    const subscription = await this.getSubscriptionStatus(userId);
    return subscription.plan_type !== 'free' && subscription.status === 'active';
  }

  /**
   * Check if user has a specific plan (cached)
   */
  async hasPlan(plan: SubscriptionTier, userId?: string): Promise<boolean> {
    const subscription = await this.getSubscriptionStatus(userId);
    return subscription.plan_type === plan && subscription.status === 'active';
  }

  /**
   * Refresh subscription data (invalidates cache)
   */
  async refreshSubscription(userId?: string): Promise<SubscriptionData> {
    const targetUserId = userId || await this.getCurrentUserId();
    if (!targetUserId) {
      return { plan_type: 'free', status: 'none' };
    }

    // Invalidate cache
    const cacheKey = createCacheKey('subscription', targetUserId);
    apiCache.invalidate(cacheKey);

    // Fetch fresh data
    return this.getSubscriptionStatus(targetUserId);
  }

  /**
   * Handle subscription upgrade (called after successful payment)
   */
  async handleUpgrade(newPlan: SubscriptionTier, userId?: string): Promise<void> {
    const targetUserId = userId || await this.getCurrentUserId();
    if (!targetUserId) return;

    // Update localStorage immediately for instant UI update
    localStorage.setItem('subscription', newPlan);

    // Invalidate cache
    const cacheKey = createCacheKey('subscription', targetUserId);
    apiCache.invalidate(cacheKey);

    // Pre-populate cache with new data
    const subscriptionData: SubscriptionData = {
      plan_type: newPlan,
      status: 'active'
    };
    
    apiCache.set(cacheKey, subscriptionData, { ttl: 5 * 60 * 1000 }); // 5 minutes
  }

  /**
   * Get current user ID (cached)
   */
  private async getCurrentUserId(): Promise<string | null> {
    if (this.currentUserId) {
      return this.currentUserId;
    }

    try {
      // Try to get from current auth context
      const { getCurrentUser } = await import('@/lib/supabase');
      const user = await getCurrentUser();
      
      if (user?.id) {
        this.currentUserId = user.id;
        return user.id;
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  /**
   * Clear user session (call on logout)
   */
  clearSession(): void {
    this.currentUserId = null;
    apiCache.invalidate('subscription');
  }
}

// Export singleton instance
export const subscriptionService = OptimizedSubscriptionService.getInstance(); 