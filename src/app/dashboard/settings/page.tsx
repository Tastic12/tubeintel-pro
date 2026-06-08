'use client';

import { useState, useEffect } from 'react';
import { Profile } from '@/types';
import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';
import { useMyChannel, invalidateDashboardData } from '@/lib/hooks';
import { resolveYoutubeChannelInput } from '@/lib/youtube-channel-input';

// Define the search result type
interface ChannelSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: string;
}

export default function SettingsPage() {
  const [channelId, setChannelId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChannelSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [profileChannelReady, setProfileChannelReady] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState<Date | null>(null);
  const { channel: connectedChannel, isLoading: channelLoading, mutate: mutateChannel } = useMyChannel({
    enabled: profileChannelReady,
  });

  // Load current channel and cooldown status on mount
  useEffect(() => {
    const loadChannel = async () => {
      try {
        const user = await getCurrentUser();
        if (!user) {
          throw new Error('User not authenticated');
        }

        // Get channel ID and cooldown from Supabase
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('youtube_channel_id, channel_change_cooldown')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          throw new Error('Failed to load profile: ' + profileError.message);
        }

        if (profile?.youtube_channel_id && typeof profile.youtube_channel_id === 'string') {
          setChannelId(profile.youtube_channel_id);
          setProfileChannelReady(true);
        }

        // Set cooldown end time if it exists
        if (profile?.channel_change_cooldown && typeof profile.channel_change_cooldown === 'string') {
          const cooldownDate = new Date(profile.channel_change_cooldown);
          cooldownDate.setDate(cooldownDate.getDate() + 7); // Add 7 days
          setCooldownEndTime(cooldownDate);
        }
      } catch (error) {
        console.error('Error loading channel:', error);
        setMessage({
          type: 'error',
          text: error instanceof Error ? error.message : 'Error loading channel. Please reconnect your channel.'
        });
      }
    };

    loadChannel();
  }, []);

  // Check if channel change is allowed
  const canChangeChannel = () => {
    if (!cooldownEndTime) return true;
    return new Date() > cooldownEndTime;
  };

  // Format cooldown message
  const getCooldownMessage = () => {
    if (!cooldownEndTime) return null;
    if (canChangeChannel()) return null;
    
    return `You can change your connected YouTube channel once every 7 days. Your next change will be available on ${cooldownEndTime.toLocaleString()}.`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId && !searchQuery) {
      setMessage({
        type: 'error',
        text: 'Please search for or enter a YouTube channel'
      });
      return;
    }

    // Check cooldown
    if (!canChangeChannel()) {
      setMessage({
        type: 'error',
        text: getCooldownMessage() || 'Channel change is currently on cooldown.'
      });
      return;
    }

    setIsConnecting(true);
    setMessage(null);

    try {
      const rawInput = channelId.trim() || searchQuery.trim();
      const extractedChannelId = await resolveYoutubeChannelInput(rawInput);
      
      // Get current user
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Update profile with new channel ID and cooldown timestamp
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          youtube_channel_id: extractedChannelId,
          channel_change_cooldown: new Date().toISOString()
        })
        .eq('id', user.id);
        
      if (updateError) {
        throw new Error('Failed to update profile: ' + updateError.message);
      }

      // Update cooldown end time
      const newCooldownEndTime = new Date();
      newCooldownEndTime.setDate(newCooldownEndTime.getDate() + 7);
      setCooldownEndTime(newCooldownEndTime);

      setChannelId(extractedChannelId);
      setProfileChannelReady(true);
      await invalidateDashboardData();
      const channel = await mutateChannel();

      setMessage({
        type: 'success',
        text: `Successfully connected to channel: ${channel?.name ?? 'your channel'}`
      });
    } catch (error: unknown) {
      console.error('Error connecting channel:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Error connecting to channel. Please check the URL/ID and try again.'
      });
      setProfileChannelReady(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Add a new search function
  const searchChannels = async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&type=channel&maxResults=5`);
      if (!response.ok) {
        throw new Error('Search failed');
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        setSearchResults([]);
        return;
      }
      
      // Format results
      const formattedResults: ChannelSearchResult[] = data.items.map((item: any) => ({
        id: item.id.channelId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.default.url
      }));
      
      setSearchResults(formattedResults);
    } catch (error) {
      console.error('Error searching channels:', error);
      setMessage({
        type: 'error',
        text: 'Failed to search channels. Please try again.'
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce search function
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchChannels(searchQuery);
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select a channel from search results
  const selectChannel = (channel: ChannelSearchResult) => {
    setChannelId(channel.id);
    setSearchQuery(channel.title);
    setSearchResults([]);
  };

  // Handle direct channel ID input changes
  const handleChannelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChannelId(e.target.value);
    // Clear the search query if user is manually entering a channel ID
    if (e.target.value) {
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  // Clear fields
  const clearFields = () => {
    setChannelId('');
    setSearchQuery('');
    setSearchResults([]);
    setMessage(null);
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 dark:text-white">Settings</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">YouTube Channel Connection</h2>
        
        {connectedChannel && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h3 className="font-medium text-green-800 dark:text-green-300 mb-2">Connected Channel</h3>
            <div className="flex items-center">
              {connectedChannel.thumbnailUrl && (
                <img 
                  src={connectedChannel.thumbnailUrl} 
                  alt={connectedChannel.name} 
                  className="w-12 h-12 rounded-full mr-3"
                />
              )}
              <div>
                <p className="font-semibold dark:text-white">{connectedChannel.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {connectedChannel.subscriberCount.toLocaleString()} subscribers • 
                  {connectedChannel.videoCount.toLocaleString()} videos
                </p>
              </div>
            </div>
          </div>
        )}

        {!canChangeChannel() && (
          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-yellow-800 dark:text-yellow-300">
              {getCooldownMessage()}
            </p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="mb-4">
            <label htmlFor="channelSearch" className="block text-gray-700 dark:text-gray-300 mb-2">
              Search for your YouTube Channel:
            </label>
            <div className="relative">
              <input
                type="text"
                id="channelSearch"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter your channel name..."
              />
              {isSearching && (
                <div className="absolute right-3 top-2">
                  <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
              
              {/* Show search results if there are any */}
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg">
                  <ul className="max-h-60 overflow-y-auto">
                    {searchResults.map((channel) => (
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
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{channel.description}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Search by name costs more API quota — pasting a URL or @handle below is cheaper.
            </p>
          </div>
          
          <div className="mb-4">
            <label htmlFor="channelId" className="block text-gray-700 dark:text-gray-300 mb-2">
              Or paste channel URL / @handle / ID:
            </label>
            <input
              type="text"
              id="channelId"
              value={channelId}
              onChange={handleChannelIdChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="e.g. https://youtube.com/@username or UC_x5XG1OV2P6uZZ5FSM9Ttw"
            />
          </div>
          
          {message && (
            <div className={`p-3 rounded-md mb-4 ${
              message.type === 'success' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {message.text}
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              type="submit"
              disabled={isConnecting || channelLoading || !canChangeChannel()}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Channel'}
            </button>
            
            <button
              type="button"
              onClick={clearFields}
              className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-md"
            >
              Clear
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 dark:text-white">Help & Resources</h2>
        <div className="space-y-3 dark:text-gray-300">
          <p>To use ClikStats effectively:</p>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Connect your YouTube channel using your channel ID</li>
            <li>Add competitor channels on the Competitors page</li>
            <li>Visit the Dashboard regularly to see insights and analytics</li>
          </ol>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
            For more help on using YouTube analytics effectively, visit the
            <a 
              href="https://support.google.com/youtube/answer/9002587" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline ml-1"
            >
              YouTube Creator Academy
            </a>
          </p>
        </div>
      </div>
    </div>
  );
} 