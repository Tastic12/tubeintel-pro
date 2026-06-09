'use client';

import { ReactNode } from 'react';
import { FaCrown } from 'react-icons/fa';
import { useSubscription } from '@/hooks/useSubscription';
import { hasProAccess } from '@/lib/subscription-limits';
import UpgradeButton from './UpgradeButton';

interface ProPageGateProps {
  children: ReactNode;
  featureName: string;
  description?: string;
}

export default function ProPageGate({
  children,
  featureName,
  description,
}: ProPageGateProps) {
  const { plan, isSubscribed, isLoading } = useSubscription();

  if (isLoading) {
    return (
      <div className="w-full max-w-[1200px] mx-auto animate-pulse">
        <div className="h-8 bg-gray-700/50 rounded w-48 mb-6" />
        <div className="h-64 bg-gray-800/50 rounded-xl" />
      </div>
    );
  }

  if (!hasProAccess(plan, isSubscribed)) {
    return (
      <div className="w-full max-w-[600px] mx-auto text-center py-16 px-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-500/10 mb-6">
          <FaCrown className="text-3xl text-blue-400" />
        </div>
        <span className="inline-block text-xs font-semibold uppercase tracking-wide text-blue-400 bg-blue-500/10 px-2 py-1 rounded mb-4">
          Pro
        </span>
        <h1 className="text-2xl font-bold dark:text-white mb-3">{featureName}</h1>
        <p className="text-gray-400 mb-8">
          {description ??
            `${featureName} is available on the Pro plan. Upgrade to unlock this feature.`}
        </p>
        <div className="flex justify-center">
          <UpgradeButton size="large" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
