'use client';

import { ReactNode } from 'react';
import { useSubscription, SubscriptionStatus } from '@/hooks/useSubscription';
import Link from 'next/link';
import { FaLock } from 'react-icons/fa';
import UpgradeButton from '@/components/UpgradeButton';

interface SubscriptionGateProps {
  children: ReactNode;
  minimumPlan: 'pro';
  fallback?: ReactNode;
}

/**
 * A component that controls access to content based on subscription level.
 * It will show the children only if the user has the required subscription.
 * Otherwise, it will show the fallback content or a default upgrade prompt.
 */
export default function SubscriptionGate({
  children,
  minimumPlan = 'pro',
  fallback
}: SubscriptionGateProps) {
  const { plan, isLoading } = useSubscription();
  
  // Check if user has required subscription level
  const hasAccess = 
    (minimumPlan === 'pro' && plan === 'pro') ||
    isLoading; // Allow access while loading to prevent flicker
  
  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 shadow-sm p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  // Show fallback content if provided
  if (fallback) {
    return <>{fallback}</>;
  }
  
  // Default upgrade prompt
  return (
    <div className="text-center py-8 px-4 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
      <div className="mb-4">
        <FaLock className="mx-auto text-4xl text-gray-400 mb-2" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-1">
          Pro Plan Required
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          This feature is available to Pro subscribers only.
        </p>
      </div>
      <UpgradeButton size="medium" />
    </div>
  );
} 