'use client';

import { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { AuthProvider } from './AuthContext';
import { ThemeProvider } from './ThemeContext';
import { MetricsProvider } from './MetricsContext';
import { SubscriptionProvider } from './SubscriptionContext';
import { defaultSwrConfig } from '@/lib/swr-config';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={defaultSwrConfig}>
      <AuthProvider>
        <ThemeProvider>
          <SubscriptionProvider>
            <MetricsProvider>
              {children}
            </MetricsProvider>
          </SubscriptionProvider>
        </ThemeProvider>
      </AuthProvider>
    </SWRConfig>
  );
} 