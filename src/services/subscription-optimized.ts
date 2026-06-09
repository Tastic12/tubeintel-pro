import { apiCache, createCacheKey } from '@/lib/api-cache';
import { ensureAuthReady } from '@/lib/auth-session';

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
  private async fetchSubscriptionFromAPI(
    userId: string,
    options?: { skipCacheOnFailure?: boolean }
  ): Promise<SubscriptionData> {
    await ensureAuthReady();

    const maxAttempts = 3;
    let lastResult: SubscriptionData = { plan_type: 'free', status: 'none' };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch('/api/subscription/status', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`API responded with ${response.status}`);
        }

        const data = await response.json();

        if (data.message === 'User not authenticated' && attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          await ensureAuthReady();
          continue;
        }

        if (data.subscribed || data.plan === 'pro') {
          const planType = (data.plan || data.subscription?.planType || 'free') as SubscriptionTier;
          return {
            plan_type: planType,
            status: data.subscription?.status === 'active' || planType === 'pro' ? 'active' : 'none',
            currentPeriodEnd: data.subscription?.currentPeriodEnd,
            stripeCustomerId: data.subscription?.stripeCustomerId,
            stripeSubscriptionId: data.subscription?.stripeSubscriptionId,
          };
        }

        lastResult = { plan_type: 'free', status: 'none' };
        break;
      } catch (error) {
        console.error('Error fetching subscription:', error);
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
          await ensureAuthReady();
          continue;
        }
      }
    }

    if (options?.skipCacheOnFailure) {
      throw new Error('Failed to fetch subscription status');
    }

    return lastResult;
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
      const session = await ensureAuthReady();
      if (session?.user?.id) {
        this.currentUserId = session.user.id;
        return session.user.id;
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('subscription');
    }
  }
}

// Export singleton instance
export const subscriptionService = OptimizedSubscriptionService.getInstance(); 