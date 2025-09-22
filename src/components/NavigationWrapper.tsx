'use client';

import { useState } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
import TourGuide from './TourGuide';

interface NavigationWrapperProps {
  children: React.ReactNode;
}

export default function NavigationWrapper({ children }: NavigationWrapperProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { theme } = useTheme();
  const { user, isLoading } = useAuth();
  
  // Get username from authenticated user (secure)
  const username = isLoading 
    ? 'Loading...' 
    : user?.username || user?.email?.split('@')[0] || 'User';
  
  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };
  
  return (
    <div className="flex min-h-screen w-full h-full overflow-hidden">
      <Sidebar collapsed={collapsed} toggleSidebar={toggleSidebar} />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopNav username={username} />
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
      
      {/* Tour Guide for new users */}
      <TourGuide />
    </div>
  );
} 