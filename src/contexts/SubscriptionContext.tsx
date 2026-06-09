'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SubscriptionStatus, SubscriptionState } from '@/hooks/useSubscription';
import { supabase } from '@/lib/supabase';
import { subscriptionService, SubscriptionData } from '@/services/subscription-optimized';
import { useAuth } from '@/contexts/AuthContext';

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

function applySubscriptionData(
  subscriptionData: SubscriptionData,
  setStatus: (status: SubscriptionState) => void,
  setPlan: (plan: SubscriptionStatus) => void,
  setExpiresAt: (date: Date | null) => void
) {
  const isPro =
    subscriptionData.plan_type === 'pro' && subscriptionData.status === 'active';

  if (isPro) {
    setStatus('active');
    setPlan('pro');
    setExpiresAt(
      subscriptionData.currentPeriodEnd
        ? new Date(subscriptionData.currentPeriodEnd)
        : null
    );
    return;
  }

  setStatus('inactive');
  setPlan('free');
  setExpiresAt(null);
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<SubscriptionState>('loading');
  const [plan, setPlan] = useState<SubscriptionStatus>('free');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  
  /**
   * Force refresh subscription data (invalidates cache)
   */
  const refreshSubscription = useCallback(async () => {
    setStatus('loading');
    try {
      const subscriptionData = await subscriptionService.refreshSubscription();
      applySubscriptionData(subscriptionData, setStatus, setPlan, setExpiresAt);
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
  
  // Load subscription only after auth has finished bootstrapping
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      subscriptionService.clearSession();
      setStatus('inactive');
      setPlan('free');
      setExpiresAt(null);
      return;
    }

    void refreshSubscription();
  }, [authLoading, isAuthenticated, refreshSubscription]);

  // Re-check on sign-in/out (refresh invalidates stale "free" cache from cookie race)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void refreshSubscription();
      } else if (event === 'SIGNED_OUT') {
        subscriptionService.clearSession();
        setStatus('inactive');
        setPlan('free');
        setExpiresAt(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshSubscription]);
  
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
