'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaUser } from 'react-icons/fa';
import { useTheme } from '@/contexts/ThemeContext';
import { Portal } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';

interface TopNavProps {
  username?: string;
}

export default function TopNav({ username = 'User' }: TopNavProps): JSX.Element {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownContentRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const router = useRouter();
  const { logout } = useAuth();
  const pathname = usePathname();
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(target) &&
        dropdownContentRef.current &&
        !dropdownContentRef.current.contains(target)
      ) {
        setDropdownOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      window.location.href = '/';
    }
  };

  const handleComingSoonClick = (feature: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    alert(`${feature} feature coming soon!`);
    setDropdownOpen(false);
  };

  const handleBillingClick = async () => {
    setDropdownOpen(false);
    try {
      const authResponse = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      
      if (!authResponse.ok) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('intended_destination', '/subscription');
        }
        window.location.href = '/login?redirectTo=/subscription';
        return;
      }

      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      
      if (data.subscribed) {
        window.location.href = '/api/stripe/create-portal';
      } else {
        window.location.href = '/subscription';
      }
    } catch (error) {
      window.location.href = '/subscription';
    }
  };

  const renderDropdown = () => (
    <>
      <a 
        href="https://discord.gg/asghh6CJra" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block px-4 py-2 hover:bg-white/10 text-white"
        onClick={() => setDropdownOpen(false)}
      >
        Discord
      </a>
      <Link 
        href="/faq"
        className="block px-4 py-2 hover:bg-white/10 text-white"
        onClick={() => setDropdownOpen(false)}
        target="_blank"
        rel="noopener noreferrer"
      >
        FAQ
      </Link>
      <button 
        onClick={handleBillingClick}
        className="block w-full text-left px-4 py-2 hover:bg-white/10 text-white"
      >
        Billing
      </button>
      <div className="relative">
        <a href="#" onClick={handleComingSoonClick('Affiliates')} className="block px-4 py-2 hover:bg-white/10 text-white opacity-60">
          Affiliates
        </a>
        <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
          <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-bold transform rotate-12">
            COMING SOON
          </span>
        </div>
      </div>
      <a 
        href="https://discord.gg/pMu8rbADTz" 
        target="_blank" 
        rel="noopener noreferrer"
        className="block px-4 py-2 hover:bg-white/10 text-white"
        onClick={() => setDropdownOpen(false)}
      >
        Help
      </a>
      <Link 
        href="/dashboard/settings"
        className="block px-4 py-2 hover:bg-white/10 text-white"
        onClick={() => setDropdownOpen(false)}
      >
        Settings
      </Link>
      
      <div className="border-t border-white/30 mt-2 pt-2">
        <button 
          className="block w-full text-left px-4 py-2 hover:bg-white/10 text-white"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </>
  );

  return (
    <header className="h-16 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-6 shadow-sm">
      <div>
        <h2 className="text-xl font-semibold text-white">YouTube Analytics Dashboard</h2>
      </div>

      {/* User Controls */}
      <div className="flex items-center gap-4">
        {/* User profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            data-tour-target="user-menu"
          >
            <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
              <FaUser className="h-4 w-4 text-white" />
            </div>
            <span className="text-white">{username}</span>
            {dropdownOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 15L12 9L18 15" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          
          {dropdownOpen && (
            <Portal>
              <div
                className="fixed right-6 top-16 w-56 bg-white/20 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg z-[2147483647] py-2"
                ref={dropdownContentRef}
              >
                <div className="px-4 py-2 border-b border-white/30 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
                      <FaUser className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{username}</p>
                    </div>
                  </div>
                </div>
                
                {renderDropdown()}
              </div>
            </Portal>
          )}
        </div>
      </div>
    </header>
  );
}
