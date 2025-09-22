'use client';

import { useState, useEffect } from 'react';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

export type SubscriptionStatus = 'free' | 'pro';
export type SubscriptionState = 'loading' | 'active' | 'inactive' | 'error';

interface SubscriptionHook {
  status: SubscriptionState;
  plan: SubscriptionStatus;
  isLoading: boolean;
  isSubscribed: boolean;
  expiresAt: Date | null;
  refreshSubscription?: () => Promise<void>;
}

/**
 * React hook to check subscription status from the server
 * This uses the SubscriptionContext for efficient state sharing
 */
export function useSubscription(): SubscriptionHook {
  // First try to use the context if available
  try {
    const context = useSubscriptionContext();
    return context;
  } catch (error) {
    // Fallback to direct API calls if context is not available
    // (this should rarely happen if the provider is properly set up)
    const [status, setStatus] = useState<SubscriptionState>('loading');
    const [plan, setPlan] = useState<SubscriptionStatus>('free');
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    
    useEffect(() => {
      async function checkSubscription() {
        try {
          const response = await fetch('/api/subscription/status');
          const data = await response.json();
          
          if (response.ok) {
            if (data.subscribed) {
              setStatus('active');
              setPlan(data.plan as SubscriptionStatus);
              setExpiresAt(data.subscription?.currentPeriodEnd ? new Date(data.subscription.currentPeriodEnd) : null);
            } else {
              setStatus('inactive');
              setPlan('free');
              setExpiresAt(null);
            }
          } else {
            console.error('Error fetching subscription status:', data.error);
            setStatus('error');
            setPlan('free');
          }
        } catch (error) {
          console.error('Failed to check subscription:', error);
          setStatus('error');
          setPlan('free');
        }
      }
      
      checkSubscription();
    }, []);
    
    return {
      status,
      plan,
      isLoading: status === 'loading',
      isSubscribed: status === 'active',
      expiresAt
    };
  }
} 