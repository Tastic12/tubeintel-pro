'use client';

import { useState, useEffect } from 'react';
import { FaCrown, FaStar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/hooks/useSubscription';

type SubscriptionTier = 'free' | 'pro';

interface UpgradeButtonProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'inline' | 'full';
}

export default function UpgradeButton({ 
  className = '', 
  size = 'medium',
  variant = 'inline'
}: UpgradeButtonProps) {
  const { plan, isLoading } = useSubscription();
  const [isClient, setIsClient] = useState(false);
  const router = useRouter();
  
  // Once component mounts, set isClient to true
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Don't render anything during SSR or while loading to prevent hydration issues
  if (!isClient || isLoading) {
    return null;
  }
  
  // If user already has Pro, don't show upgrade button
  if (plan === 'pro') {
    return null;
  }
  
  // Handle button click - direct navigation to subscription page
  const handleUpgradeClick = () => {
    router.push('/subscription');
  };
  
  // Size classes
  const sizeClasses = {
    small: 'text-xs py-1 px-2',
    medium: 'text-sm py-2 px-3',
    large: 'text-base py-3 px-4'
  };
  
  // Icon based on current plan
  const icon = <FaCrown className="mr-1.5" />;
  
  // Button text based on current plan
  const buttonText = 'Upgrade to Pro';
  
  // Return button with appropriate styling
  return (
    <button
      onClick={handleUpgradeClick}
      className={`
        flex items-center justify-center font-medium rounded-full transition-colors
        ${sizeClasses[size]}
        ${variant === 'full' ? 'w-full' : ''}
        bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 text-white
        ${className}
      `}
    >
      {icon}
      {buttonText}
    </button>
  );
} 