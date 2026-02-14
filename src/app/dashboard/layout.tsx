'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { NavigationWrapper } from '@/components/layout';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Check if user is logged in when auth context updates
    if (!isLoading) {
      if (!isAuthenticated || !user) {
        // Not authenticated, redirect to login
        console.log('Not authenticated, redirecting to login');
        router.push('/login');
      }
    }
  }, [router, user, isAuthenticated, isLoading]);

  return <NavigationWrapper>{children}</NavigationWrapper>;
} 