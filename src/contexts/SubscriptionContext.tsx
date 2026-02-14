'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SubscriptionStatus, SubscriptionState } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { subscriptionService, SubscriptionData } from '@/services/subscription-optimized';

interface SubscriptionContextType {
  plan: SubscriptionStatus;
  status: SubscriptionState;
  isLoading: boolean;
  isSubscribed: boolean;
  expiresAt: Date | null;
  refreshSubscription: () => Promise<void>;
  checkAfterUpgrade: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export function useSubscriptionContext() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  }
  return context;
}

interface SubscriptionProviderProps {
  children: React.ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [status, setStatus] = useState<SubscriptionState>('loading');
  const [plan, setPlan] = useState<SubscriptionStatus>('free');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  /**
   * Check subscription using the optimized service (with caching)
   * This is the SINGLE source of truth for subscription data
   */
  const checkSubscription = useCallback(async () => {
    try {
      // Use the optimized service which handles caching internally
      const subscriptionData = await subscriptionService.getSubscriptionStatus();
      
      if (subscriptionData.status === 'active') {
        setStatus('active');
        setPlan(subscriptionData.plan_type as SubscriptionStatus);
        setExpiresAt(subscriptionData.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd) : null);
      } else {
        setStatus('inactive');
        setPlan('free');
        setExpiresAt(null);
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
      setStatus('error');
      setPlan('free');
    }
  }, []);
  
  /**
   * Force refresh subscription data (invalidates cache)
   */
  const refreshSubscription = useCallback(async () => {
    setStatus('loading');
    try {
      // Use the optimized service's refresh method which invalidates cache
      const subscriptionData = await subscriptionService.refreshSubscription();
      
      if (subscriptionData.status === 'active') {
        setStatus('active');
        setPlan(subscriptionData.plan_type as SubscriptionStatus);
        setExpiresAt(subscriptionData.currentPeriodEnd ? new Date(subscriptionData.currentPeriodEnd) : null);
      } else {
        setStatus('inactive');
        setPlan('free');
        setExpiresAt(null);
      }
    } catch (error) {
      console.error('Failed to refresh subscription:', error);
      setStatus('error');
      setPlan('free');
    }
  }, []);
  
  /**
   * Special function to check after an upgrade
   * Uses the optimized service's handleUpgrade method for instant UI update
   */
  const checkAfterUpgrade = useCallback(async () => {
    setStatus('loading');
    
    // Small delay to allow webhook processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Force refresh from API
    await refreshSubscription();
  }, [refreshSubscription]);
  
  // Set up Supabase auth listener to detect login/logout
  useEffect(() => {
    // Initial subscription check on mount
    checkSubscription();
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // User just signed in, check their subscription
          checkSubscription();
        } else if (event === 'SIGNED_OUT') {
          // User signed out, reset to free plan and clear service cache
          subscriptionService.clearSession();
          setStatus('inactive');
          setPlan('free');
          setExpiresAt(null);
        }
      }
    );
    
    // Clean up
    return () => {
      subscription.unsubscribe();
    };
  }, [checkSubscription]);
  
  const value = {
    plan,
    status,
    isLoading: status === 'loading',
    isSubscribed: status === 'active',
    expiresAt,
    refreshSubscription,
    checkAfterUpgrade
  };
  
  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}
