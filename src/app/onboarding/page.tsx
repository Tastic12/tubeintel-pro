'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaYoutube, FaCopy, FaLink, FaQuestionCircle, FaSearch } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface ChannelPreview {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [channelId, setChannelId] = useState('');
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [channelSearchResults, setChannelSearchResults] = useState<ChannelPreview[]>([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [channelPreview, setChannelPreview] = useState<ChannelPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  
  // Use AuthContext for secure authentication
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) return;
    
    if (!isAuthenticated || !user) {
      // Not authenticated, redirect to login
      console.log('Not authenticated, redirecting to login from onboarding');
      router.push('/login');
      return;
    }
    
    // Check if user has already completed onboarding
    const checkOnboardingStatus = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('youtube_channel_id')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          return;
        }

        if (profile?.youtube_channel_id) {
          // User has already completed onboarding, redirect to dashboard
          console.log('User already completed onboarding, redirecting to dashboard');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    
    checkOnboardingStatus();
  }, [router, isAuthenticated, user, authLoading]);

  // Add a new search function for channels
  const searchChannels = async (query: string) => {
    if (!query || query.length < 3) {
      setChannelSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&type=channel&maxResults=5`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      // Format results
      const formattedResults: ChannelPreview[] = data.items.map((item: any) => ({
        id: item.id.channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.default.url
      }));
      
      setChannelSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching channels:', error);
      setError('Failed to search channels. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search function
  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelSearchQuery) {
        searchChannels(channelSearchQuery);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [channelSearchQuery]);

  // Select a channel from search results
  const selectChannel = (channel: ChannelPreview) => {
    setChannelId(channel.id);
    setChannelSearchQuery(channel.title);
    setChannelSearchResults([]);
    fetchChannelPreview(channel.id);
  };

  // Handle direct channel ID input changes
  const handleChannelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    setChannelId(newId);
    setError('');
    setChannelSearchQuery('');
    setChannelSearchResults([]);

    if (newId.startsWith('UC') && newId.length === 24) {
      fetchChannelPreview(newId);
    } else {
      setChannelPreview(null);
    }
  };

  const fetchChannelPreview = async (id: string) => {
    setIsPreviewLoading(true);
    try {
      const response = await fetch(`/api/youtube/channels?id=${encodeURIComponent(id)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch channel info');
      }
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const channel = data.items[0];
        setChannelPreview({
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnailUrl: channel.snippet.thumbnails.medium.url,
          subscriberCount: channel.statistics?.subscriberCount
        });
      } else {
        throw new Error('Channel not found');
      }
    } catch (error) {
      console.error('Error fetching channel preview:', error);
      setError('Failed to fetch channel information');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Authentication required. Please log in again.');
      router.push('/login');
      return;
    }
    
    if (!channelId) {
      setError('Please enter your YouTube channel ID');
      return;
    }

    if (!channelId.startsWith('UC') || channelId.length !== 24) {
      setError('Invalid channel ID format');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          youtube_channel_id: channelId,
          has_completed_onboarding: true,
          channel_change_cooldown: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) {
        throw new Error('Failed to update profile: ' + updateError.message);
      }
      
      // Set a flag to indicate user just completed onboarding
      sessionStorage.setItem('just-completed-onboarding', 'true');
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Onboarding error:', err);
      setError(err.message || 'Failed to save channel information');
    } finally {
      setIsLoading(false);
    }
  };

  const ChannelIdHelpModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold mb-4 dark:text-white">How to Find Your Channel ID</h3>
          
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2 dark:text-white">Method 1: From Channel URL</h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Go to your YouTube channel page</li>
                <li>Look at the URL in your browser</li>
                <li>If it contains "/channel/UC...", copy the part after "/channel/"</li>
                <li>If it contains "/@username" or "/c/ChannelName", use the URL converter above</li>
              </ol>
            </div>

            <div>
              <h4 className="font-semibold mb-2 dark:text-white">Method 2: From YouTube Studio</h4>
              <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300">
                <li>Go to YouTube Studio (studio.youtube.com)</li>
                <li>Click on "Settings" in the left menu</li>
                <li>Click on "Channel"</li>
                <li>Scroll down to find your channel ID</li>
              </ol>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <span className="font-semibold">Note:</span> Your channel ID is required for security and reliability. 
                It helps us provide accurate analytics and maintain efficient service.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-2">
            <FaYoutube className="text-red-500 text-4xl mr-2" />
            <h1 className="text-3xl font-bold dark:text-white">TubeIntel Pro</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">Let's set up your YouTube channel</p>
        </div>
        
        {/* Onboarding Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-center mb-6 dark:text-white">Channel Setup</h2>
          
          {user && (
            <p className="text-center mb-6 dark:text-gray-300">
              Welcome, <span className="font-semibold">{user.username || user.email?.split('@')[0]}</span>! 
              Let's complete your setup.
            </p>
          )}
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 mb-4">
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Channel Search */}
            <div>
              <label htmlFor="channelSearch" className="block text-gray-700 dark:text-gray-300 mb-2">
                Search for your YouTube Channel
              </label>
              <div className="relative">
                <input
                  id="channelSearch"
                  type="text"
                  value={channelSearchQuery}
                  onChange={(e) => setChannelSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white pl-10"
                  placeholder="Enter channel name..."
                />
                {isSearching && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                  </div>
                )}
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <FaSearch />
                </div>
                
                {channelSearchResults.length > 0 && !channelId && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
                    <ul className="max-h-60 overflow-y-auto">
                      {channelSearchResults.map((channel) => (
                        <li 
                          key={channel.id}
                          onClick={() => selectChannel(channel)}
                          className="flex items-center p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                        >
                          <img 
                            src={channel.thumbnailUrl} 
                            alt={channel.title} 
                            className="w-10 h-10 rounded-full mr-3"
                          />
                          <div>
                            <p className="font-medium dark:text-white">{channel.title}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{channel.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Search for your channel by name to find and select it
              </p>
            </div>

            {/* Channel ID Input */}
            <div>
              <label htmlFor="channelId" className="block text-gray-700 dark:text-gray-300 mb-2">
                Or enter YouTube Channel ID directly
              </label>
              <div className="flex gap-2">
                <input
                  id="channelId"
                  type="text"
                  value={channelId}
                  onChange={handleChannelIdChange}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                  placeholder="UC..."
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Enter your YouTube channel ID (starts with "UC")
              </p>
            </div>

            {/* Channel Preview */}
            {isPreviewLoading && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {channelPreview && (
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <img 
                    src={channelPreview.thumbnailUrl} 
                    alt={channelPreview.title}
                    className="w-16 h-16 rounded-full"
                  />
                  <div>
                    <h3 className="font-semibold dark:text-white">{channelPreview.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                      {channelPreview.description}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Help Button */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowHelpModal(true)}
                className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-2"
              >
                <FaQuestionCircle />
                How to find my channel ID?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !channelId}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : 'Continue to Dashboard'}
            </button>
          </form>
        </div>
        
        {/* Info Box */}
        <div className="mt-4 text-center">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <span className="font-semibold">Note:</span> Your channel ID will be securely stored and used to fetch analytics data about your channel only.
          </p>
        </div>
      </div>

      <ChannelIdHelpModal isOpen={showHelpModal} onClose={() => setShowHelpModal(false)} />
    </div>
  );
} 