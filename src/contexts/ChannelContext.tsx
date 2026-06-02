'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { Channel } from '@/types';
import { useMyChannel } from '@/lib/hooks';

interface ChannelContextType {
  channel: Channel | null;
  isLoading: boolean;
  error: string | null;
  refreshChannel: () => Promise<void>;
  setChannel: (channel: Channel | null) => void;
}

const ChannelContext = createContext<ChannelContextType | undefined>(undefined);

interface ChannelProviderProps {
  children: ReactNode;
}

export function ChannelProvider({ children }: ChannelProviderProps) {
  const { channel, isLoading, isError, mutate } = useMyChannel();

  const refreshChannel = async () => {
    await mutate();
  };

  const setChannel = (_channel: Channel | null) => {
    // Optimistic local updates can be wired via mutate(data, false) when needed.
    void mutate();
  };

  const value: ChannelContextType = {
    channel,
    isLoading,
    error: isError instanceof Error ? isError.message : isError ? 'Failed to fetch channel' : null,
    refreshChannel,
    setChannel,
  };

  return (
    <ChannelContext.Provider value={value}>
      {children}
    </ChannelContext.Provider>
  );
}

export function useChannel() {
  const context = useContext(ChannelContext);
  if (context === undefined) {
    throw new Error('useChannel must be used within a ChannelProvider');
  }
  return context;
}
