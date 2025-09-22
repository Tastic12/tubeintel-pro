'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  FaYoutube, 
  FaChartLine, 
  FaUsers, 
  FaLightbulb, 
  FaCog,
  FaBars,
  FaCrown,
  FaStar,
  FaLock,
  FaImage,
  FaPlay,
  FaBook
} from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { useState, useEffect } from 'react';
import UpgradeButton from './UpgradeButton';
import { useSubscription } from '@/hooks/useSubscription';
import { getTourCompletionStatus, resetTourCompletion } from '@/lib/tour-utils';

// Subscription types
type SubscriptionTier = 'free' | 'pro';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive?: boolean;
  collapsed?: boolean;
  locked?: boolean;
  requiredSubscription?: SubscriptionTier;
  currentSubscription?: SubscriptionTier;
  dataTourTarget?: string;
}

const SidebarItem = ({ 
  icon, 
  label, 
  href, 
  isActive, 
  collapsed, 
  locked = false,
  requiredSubscription,
  currentSubscription,
  dataTourTarget
}: SidebarItemProps): JSX.Element => {
  const { theme } = useTheme();
  
  // Check if feature is locked based on subscription tier
  const isFeatureLocked = locked || (
    requiredSubscription && 
    currentSubscription && 
    requiredSubscription === 'pro' && currentSubscription === 'free'
  );
  
  return (
    <Link 
      href={isFeatureLocked ? '/subscription' : href}
      className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3 px-3'} py-3 rounded-lg transition-all duration-200 ${
        isActive 
          ? `${theme === 'dark' ? 'bg-[#00264d] text-blue-200' : 'bg-blue-100 text-blue-800'}` 
          : `${theme === 'dark' ? 'text-gray-400 hover:bg-gray-800 hover:text-white' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'}`
      } ${isFeatureLocked ? 'opacity-70' : ''}`}
      data-tour-target={dataTourTarget}
    >
      <div className={collapsed ? 'flex justify-center items-center w-full' : ''}>
        {icon}
      </div>
      {!collapsed && (
        <>
          <span className="text-sm font-medium transition-opacity duration-200 flex-1">{label}</span>
          {isFeatureLocked && <FaLock size={12} className="text-gray-400" />}
        </>
      )}
    </Link>
  );
};

// Section divider component
const SectionDivider = ({ label, collapsed }: { label: string, collapsed: boolean }) => {
  if (collapsed) return <div className="border-t border-gray-700 my-3 mx-2"></div>;
  
  return (
    <div className="px-3 py-2 mt-2">
      <div className="flex items-center">
        <div className="border-t border-gray-700 flex-grow mr-2"></div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
        <div className="border-t border-gray-700 flex-grow ml-2"></div>
      </div>
    </div>
  );
};

interface SidebarProps {
  collapsed: boolean;
  toggleSidebar: () => void;
}

export default function Sidebar({ collapsed, toggleSidebar }: SidebarProps): JSX.Element {
  const pathname = usePathname();
  const { theme } = useTheme();
  const { plan, isLoading } = useSubscription();
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [tourCompleted, setTourCompleted] = useState<boolean>(false);
  const [tourStatusLoading, setTourStatusLoading] = useState<boolean>(true);
  
  // Update subscription tier when the plan changes
  useEffect(() => {
    if (!isLoading) {
      setSubscriptionTier(plan);
      
      // For debugging - log the subscription status
      console.log('Subscription plan from API:', plan);
    }
  }, [plan, isLoading]);
  
  // Check tour completion status
  useEffect(() => {
    const checkTourStatus = async () => {
      try {
        const completed = await getTourCompletionStatus();
        setTourCompleted(completed);
      } catch (error) {
        console.error('Error checking tour status in sidebar:', error);
        // Fallback to localStorage
        const localCompleted = localStorage.getItem('clikstats-tour-completed') === 'true';
        setTourCompleted(localCompleted);
      } finally {
        setTourStatusLoading(false);
      }
    };

    checkTourStatus();

    // Listen for tour completion events
    const handleTourCompleted = () => {
      setTourCompleted(true);
    };

    // Listen for storage changes (tour completion)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clikstats-tour-completed') {
        setTourCompleted(e.newValue === 'true');
      }
    };

    window.addEventListener('tour-completed', handleTourCompleted);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('tour-completed', handleTourCompleted);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  const isActive = (path: string): boolean => {
    return pathname === path || pathname.startsWith(`${path}/`);
  };
  
  const bgColor = 'bg-gray-800';
  const borderColor = 'border-gray-700';
  const textColor = 'text-white';
  
  const shouldShowUpgradePrompt = (
    requiredSubscription: string,
    currentSubscription: SubscriptionTier
  ): boolean => {
    return (
      requiredSubscription === 'pro' && currentSubscription === 'free'
    );
  };
  
  return (
    <div 
      className={`${
        collapsed ? 'w-[70px]' : 'w-[240px]'
      } h-screen flex-shrink-0 bg-white/10 backdrop-blur-md border-r border-white/20 py-6 flex flex-col transition-all duration-300 ease-in-out`}
    >
      {collapsed ? (
        <>
          <div className="flex justify-center mb-6">
            <button 
              onClick={toggleSidebar}
              className={`${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} p-2 rounded-full transition-colors`}
              aria-label="Expand sidebar"
            >
              <FaBars className="h-5 w-5" />
            </button>
          </div>
          
          <div className="flex justify-center mb-6">
            <Link href="/dashboard">
              <div className="text-red-500">
                <FaYoutube className="h-7 w-7" />
              </div>
            </Link>
          </div>
        </>
      ) : (
        <div className="px-4 mb-6 flex items-center justify-between">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="text-red-500">
              <FaYoutube className="h-7 w-7" />
            </div>
            <span className={`font-bold text-xl ${textColor}`}>ClikStats</span>
            {subscriptionTier !== 'free' && (
              <span className={`${
                'text-blue-500 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30'
              } text-xs font-medium px-1.5 py-0.5 rounded`}>
                Pro
              </span>
            )}
          </Link>

          <button 
            onClick={toggleSidebar}
            className={`${theme === 'dark' ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'} p-2 rounded-full transition-colors ml-auto`}
            aria-label="Collapse sidebar"
          >
            <FaBars className="h-5 w-5" />
          </button>
        </div>
      )}
      
      {/* Core Features */}
      <div className="flex flex-col gap-1 px-2 mt-4">
        <SidebarItem 
          icon={<FaChartLine size={18} />} 
          label="Dashboard" 
          href="/dashboard"
          isActive={isActive('/dashboard') && !isActive('/dashboard/competitors')} 
          collapsed={collapsed}
          dataTourTarget="dashboard"
        />

        {/* Tracker Section */}
        <SectionDivider label="TRACKER" collapsed={collapsed} />
        
        <SidebarItem 
          icon={<FaUsers size={18} />} 
          label="Channels" 
          href="/dashboard/competitors"
          isActive={isActive('/dashboard/competitors')} 
          collapsed={collapsed}
        />
        
        {/* Videos - now active */}
        <SidebarItem 
          icon={<FaPlay size={18} />} 
          label="Videos" 
          href="/dashboard/videos"
          isActive={isActive('/dashboard/videos')} 
          collapsed={collapsed}
        />
        
        {/* Beginner's Guide - now active */}
        <SidebarItem 
          icon={<FaBook size={18} />} 
          label="Beginner's Guide" 
          href="/dashboard/guide"
          isActive={isActive('/dashboard/guide')} 
          collapsed={collapsed}
        />
      </div>
      
      {/* Subscription link */}
      {!collapsed && subscriptionTier !== 'pro' && (
        <div className="mt-4 mx-3">
          <UpgradeButton variant="full" className="w-full" />
        </div>
      )}
      
      <div className="mt-auto px-4">
        {!collapsed && !tourCompleted && !tourStatusLoading && (
          <>
            {/* Tour restart button - only show if tour not completed */}
            <button
              onClick={async () => {
                try {
                  await resetTourCompletion();
                  setTourCompleted(false);
                  // Dispatch custom event to restart tour without page refresh
                  window.dispatchEvent(new CustomEvent('restart-tour'));
                } catch (error) {
                  console.error('Error restarting tour:', error);
                  // Fallback to localStorage method
                  localStorage.removeItem('clikstats-tour-completed');
                  window.dispatchEvent(new CustomEvent('restart-tour'));
                }
              }}
              className="w-full mb-4 flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 px-3 py-2 rounded-full text-sm transition-colors border border-blue-500/30"
              title="Take Tour"
            >
              <FaPlay size={12} />
              Take Tour
            </button>
          </>
        )}

        {!collapsed && (
          <div className={`border-t ${borderColor} pt-4`}>
            <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} text-xs`}>© 2024 ClikStats</p>
          </div>
        )}
      </div>
    </div>
  );
}