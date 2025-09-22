'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FaArrowLeft, FaPlus, FaTimes, FaYoutube, FaEllipsisV, FaChartBar, FaDownload, FaFilter, FaChevronDown, FaStar, FaRocket, FaTrophy, FaCheck, FaCalendarAlt, FaEye, FaEyeSlash, FaThLarge, FaSearch, FaExternalLinkAlt, FaPlay, FaBookmark, FaClipboard, FaChartLine, FaListUl, FaTh, FaInfoCircle, FaRegClock, FaLink, FaCrown, FaLock } from 'react-icons/fa';
import Link from 'next/link';
import { Competitor, Video } from '@/types';
import { videosApi } from '@/services/api';
import { competitorListsApi } from '@/services/api/competitorLists';
import { secureYoutubeService } from '@/services/api/youtube-secure';
import SearchFilters from '@/components/SearchFilters';
import { calculateOutlierScore, calculatePerformanceScore } from '@/services/metrics/outliers';
import { useSubscription } from '@/hooks/useSubscription';

// Format number to compact form
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

// Define the search result type
interface ChannelSearchResult {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount?: string;
}

export default function CompetitorListDetail({ params }: { params: { listId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listName = searchParams.get('name') || 'Competitor List';
  const { plan, isSubscribed, isLoading: subscriptionLoading } = useSubscription();
  
  // Basic states
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCompetitorId, setNewCompetitorId] = useState('');
  const [channelSearchQuery, setChannelSearchQuery] = useState('');
  const [channelSearchResults, setChannelSearchResults] = useState<ChannelSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Free tier limits
  const FREE_TIER_CHANNEL_LIMIT = 5;

  // Check if user can add more channels
  const canAddChannel = () => {
    if (isSubscribed || plan !== 'free') return true;
    return competitors.length < FREE_TIER_CHANNEL_LIMIT;
  };

  // Show upgrade modal for channel limit
  const showChannelUpgradePrompt = () => {
    setShowUpgradeModal(true);
  };

  // Modified openModal function to check channel limits
  const openAddChannelModal = () => {
    if (!canAddChannel()) {
      showChannelUpgradePrompt();
      return;
    }
    setIsModalOpen(true);
  };
  
  // Chart and filter states
  const [chartMetric, setChartMetric] = useState('Subscribers');
  const [subscribersOnly, setSubscribersOnly] = useState(true);
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'views'>('date');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<'30d' | '90d' | '180d' | '365d' | '3y' | 'all'>('30d');
  const [filteredCompetitorVideos, setFilteredCompetitorVideos] = useState<Video[]>([]);
  const [activeFilters, setActiveFilters] = useState<any>(null);
  
  // Video states
  const [competitorVideos, setCompetitorVideos] = useState<Video[]>([]);
  const [similarVideos, setSimilarVideos] = useState<Video[]>([]);
  const [videoGridColumns, setVideoGridColumns] = useState<number>(4);
  const [showVideoInfo, setShowVideoInfo] = useState<boolean>(true);
  const [videoSearchQuery, setVideoSearchQuery] = useState<string>('');
  const [activeVideoTab, setActiveVideoTab] = useState<'competitors'>('competitors');
  
  // Context menu states
  const [showVideoContextMenu, setShowVideoContextMenu] = useState<boolean>(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{x: number, y: number}>({x: 0, y: 0});
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [minSubscribers, setMinSubscribers] = useState<number>(0);
  const [viewsThreshold, setViewsThreshold] = useState<number>(10000000);
  const [subscribersThreshold, setSubscribersThreshold] = useState<number>(100000);
  const [videoDurationThreshold, setVideoDurationThreshold] = useState<number>(60);
  const [dateRange, setDateRange] = useState<[string, string]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    new Date().toISOString().split('T')[0]
  ]);
  const [viewMultiplierThreshold, setViewMultiplierThreshold] = useState<number>(1.5);
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);
  const [channelAgeThreshold, setChannelAgeThreshold] = useState<number>(12);
  const [videoCommentsThreshold, setVideoCommentsThreshold] = useState<number>(1000);
  const [videoLikesThreshold, setVideoLikesThreshold] = useState<number>(5000);
  const [videoCountThreshold, setVideoCountThreshold] = useState<number>(50);
  const [totalChannelViewsThreshold, setTotalChannelViewsThreshold] = useState<number>(1000000);
  const [includeKeywords, setIncludeKeywords] = useState<string>("");
  const [excludeKeywords, setExcludeKeywords] = useState<string>("");
  const [isVideoLoading, setIsVideoLoading] = useState<boolean>(false);

  // Helper function to render engagement rate with deterministic values
  const renderEngagementRate = (channelId: string) => {
    // Use a hash function to create a deterministic value from the channel ID
    const hashCode = channelId.split('').reduce(
      (acc, char) => (acc * 31 + char.charCodeAt(0)) & 0xffffffff, 0
    );
    // Generate engagement rate between 2% and 12%
    const engagementRate = (2 + (hashCode % 100) / 10).toFixed(1);
    
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full" 
            style={{ width: `${Math.min(parseFloat(engagementRate) * 10, 100)}%` }}
          ></div>
        </div>
        <span className="text-gray-800 dark:text-gray-200">{engagementRate}%</span>
      </div>
    );
  };

  // Helper function to render growth rate with deterministic values
  const renderGrowthRate = (channelId: string) => {
    // Use a different hash function variant for growth rate
    const hashCode = channelId.split('').reduce(
      (acc, char, i) => (acc * 37 + char.charCodeAt(0) + i) & 0xffffffff, 0
    );
    // Generate growth rate between -5% and +16%
    const growthRate = ((hashCode % 210) / 10 - 5).toFixed(1);
    const isPositiveGrowth = parseFloat(growthRate) > 0;
    
    return (
      <div className="flex items-center gap-1">
        {isPositiveGrowth ? (
          <span className="text-green-600 dark:text-green-500">↑</span>
        ) : (
          <span className="text-red-600 dark:text-red-500">↓</span>
        )}
        <span className={isPositiveGrowth ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}>
          {isPositiveGrowth ? '+' : ''}{growthRate}%
        </span>
      </div>
    );
  };

  // Call the check on mount
  useEffect(() => {
    fetchCompetitors();
  }, []);
  
  // Add a useEffect to handle clicks outside the context menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowVideoContextMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchCompetitors = async () => {
    try {
      setIsLoading(true);
      
      console.log(`Fetching competitors for list ${params.listId}...`);
      
      // Get the competitor list from Supabase
      try {
        const competitors = await competitorListsApi.getCompetitorsInList(params.listId);
        console.log(`Found ${competitors.length} competitors in list ${params.listId}`);
        
        // Convert from DB format to our app format
        const formattedCompetitors: Competitor[] = [];
        
        // For each competitor, get fresh data from YouTube
        for (const c of competitors) {
          try {
            // Try to get fresh data from YouTube
            console.log(`Fetching updated data for channel ${c.name} (${c.youtubeId})...`);
            const channelData = await secureYoutubeService.getChannelById(c.youtubeId);
            
            // Use the fresh data but keep our database ID
            formattedCompetitors.push({
              id: c.id,
              youtubeId: c.youtubeId,
              name: channelData.name,
              thumbnailUrl: channelData.thumbnailUrl,
              subscriberCount: channelData.subscriberCount,
              videoCount: channelData.videoCount,
              viewCount: channelData.viewCount
            });
            
            console.log(`Updated data received for ${channelData.name}`);
          } catch (error) {
            console.error(`Error fetching data for channel ${c.youtubeId}:`, error);
            
            // Fall back to database data if YouTube API fails
            formattedCompetitors.push({
              id: c.id,
              youtubeId: c.youtubeId,
              name: c.name,
              thumbnailUrl: c.thumbnailUrl || '',
              subscriberCount: c.subscriberCount || 0,
              videoCount: c.videoCount || 0,
              viewCount: c.viewCount || 0
            });
          }
        }
        
        setCompetitors(formattedCompetitors);
        
        // After getting competitors, fetch their videos
        if (formattedCompetitors.length > 0) {
          fetchCompetitorVideos(formattedCompetitors);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error fetching competitors for list:', error);
        if (error instanceof Error && error.message.includes('not found')) {
          // List not found, redirect to the main competitors page
          router.push('/dashboard/competitors');
        }
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error in fetchCompetitors:', error);
      setIsLoading(false);
    }
  };
  
  const fetchCompetitorVideos = async (competitorsList: Competitor[]) => {
    try {
      setIsVideoLoading(true);
      const allVideos: Video[] = [];
      
      // Process all competitors
      const competitorsToFetch = competitorsList;
      
      // Fetch videos for each competitor (10 videos per competitor)
      for (const competitor of competitorsToFetch) {
        try {
          console.log(`Fetching videos for channel ${competitor.name} (${competitor.youtubeId})...`);
          const videos = await secureYoutubeService.getVideosByChannelId(competitor.youtubeId, 10);
          allVideos.push(...videos);
          console.log(`Found ${videos.length} videos for channel ${competitor.name}`);
        } catch (error) {
          console.error(`Error fetching videos for channel ${competitor.youtubeId}:`, error);
        }
      }
      
      // Sort videos by published date (newest first)
      const sortedVideos = allVideos.sort((a, b) => 
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      );
      
      setCompetitorVideos(sortedVideos);
      setFilteredCompetitorVideos(sortedVideos); // Also set filtered videos initially
      setIsVideoLoading(false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching competitor videos:', error);
      setIsVideoLoading(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompetitors();
  }, [params.listId]);

  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newCompetitorId) {
      setError('Please enter a YouTube channel ID');
      return;
    }

    setError(null);
    setIsAdding(true);
    
    try {
      // First get the channel data from YouTube
      let channelData;
      try {
        console.log(`Fetching channel data for ${newCompetitorId}...`);
        channelData = await secureYoutubeService.getChannelById(newCompetitorId);
        console.log('Channel data retrieved:', channelData);
        
        // Verify all required fields are present
        if (!channelData || !channelData.youtubeId || !channelData.name) {
          console.error('Invalid channel data:', channelData);
          throw new Error('Invalid channel data received from YouTube. Missing required fields.');
        }
      } catch (channelError) {
        console.error('Error fetching channel data from YouTube:', channelError);
        if (channelError instanceof Error) {
          setError(`Could not fetch channel information: ${channelError.message}`);
        } else {
          setError('Could not fetch channel information. Please check the channel ID and try again.');
        }
        setIsAdding(false);
        return;
      }
      
      // Now use the data from YouTube to add to the competitor list
      // Ensure all required fields are properly defined with fallbacks
      const competitorData = {
        youtubeId: channelData.youtubeId,
        name: channelData.name,
        thumbnailUrl: channelData.thumbnailUrl || '',
        subscriberCount: typeof channelData.subscriberCount === 'number' ? channelData.subscriberCount : 0,
        videoCount: typeof channelData.videoCount === 'number' ? channelData.videoCount : 0,
        viewCount: typeof channelData.viewCount === 'number' ? channelData.viewCount : 0
      };
      
      console.log('Prepared competitor data:', competitorData);
      
      try {
        // Add to competitor list in Supabase
        console.log('Adding competitor to list:', params.listId);
        const competitor = await competitorListsApi.addCompetitorToList(
          params.listId,
          competitorData
        );
        
        console.log('Competitor added successfully:', competitor);
        
        // Convert from the TrackedCompetitor type to Competitor type for UI
        const newCompetitor: Competitor = {
          id: competitor.id,
          youtubeId: competitor.youtubeId,
          name: competitor.name,
          thumbnailUrl: competitor.thumbnailUrl || '',
          subscriberCount: competitor.subscriberCount || 0,
          videoCount: competitor.videoCount || 0,
          viewCount: competitor.viewCount || 0
        };
        
        setCompetitors(prev => [...prev, newCompetitor]);
        
        // Fetch videos for the new competitor
        try {
          // Set video loading indicator to true
          setIsVideoLoading(true);
          
          console.log('Fetching videos for new competitor:', newCompetitor.youtubeId);
          const videos = await secureYoutubeService.getVideosByChannelId(newCompetitor.youtubeId, 10);
          console.log('Videos fetched successfully:', videos.length);
          
          // Sort the videos by published date (newest first)
          const sortedVideos = videos.sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          );
          
          // Update both competitorVideos and filteredCompetitorVideos
          setCompetitorVideos(prev => [...sortedVideos, ...prev]);
          setFilteredCompetitorVideos(prev => [...sortedVideos, ...prev]);
          
          // If there's an active search, filter the videos again
          if (videoSearchQuery.trim()) {
            const query = videoSearchQuery.toLowerCase();
            const newFiltered = [...sortedVideos, ...competitorVideos].filter(video =>
              video.title.toLowerCase().includes(query) ||
              video.description.toLowerCase().includes(query)
            );
            setFilteredCompetitorVideos(newFiltered);
          }
        } catch (videoError) {
          console.error('Error fetching videos for new competitor:', videoError);
          // Continue even if we can't fetch videos - we've already added the competitor
        } finally {
          setIsVideoLoading(false);
        }
        
        setNewCompetitorId('');
        setIsModalOpen(false);
      } catch (apiError) {
        console.error('Error adding competitor to Supabase:', apiError);
        if (apiError instanceof Error) {
          setError(`Failed to save competitor: ${apiError.message}`);
        } else {
          setError('Failed to save competitor. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error in handleAddCompetitor:', error);
      if (error instanceof Error) {
        setError(`Could not add this channel: ${error.message}`);
      } else {
        setError('Could not add this channel. Please check the ID and try again.');
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveCompetitor = async (id: string) => {
    try {
      // Find the competitor being removed to get its youtubeId
      const competitorToRemove = competitors.find(comp => comp.id === id);
      
      // Remove the competitor using the direct API instead of the adapter
      await competitorListsApi.removeCompetitorFromList(id);
      
      // Update the competitors list in UI
      setCompetitors(prev => prev.filter(competitor => competitor.id !== id));
      
      // If we found the competitor, also remove its videos from both video lists
      if (competitorToRemove) {
        // Filter out any videos that belong to this competitor's channel
        setCompetitorVideos(prev => 
          prev.filter(video => video.channelId !== competitorToRemove.youtubeId)
        );
        
        // Also update the filtered videos to maintain consistency
        setFilteredCompetitorVideos(prev => 
          prev.filter(video => video.channelId !== competitorToRemove.youtubeId)
        );
      }
    } catch (error) {
      console.error('Error removing competitor:', error);
    }
  };

  // Function to determine icon based on subscriber count or other metrics
  const getCompetitorIcon = (competitor: Competitor) => {
    const { subscriberCount, viewCount } = competitor;
    
    // Top tier - over 1M subscribers
    if (subscriberCount >= 1000000) {
      return <FaStar size={16} className="text-yellow-500" />;
    }
    
    // High growth - high view to subscriber ratio
    if (viewCount / subscriberCount > 100) {
      return <FaRocket size={16} className="text-red-500" />;
    }
    
    // Good performer - over 100K subscribers
    if (subscriberCount >= 100000) {
      return <FaTrophy size={16} className="text-indigo-500" />;
    }
    
    // Default
    return <FaCheck size={16} className="text-green-500" />;
  };

  // Function to handle filter apply
  const applyFilter = () => {
    // In a real app, this would filter based on the selected criteria
    // Here's how we might filter the competitors based on the thresholds:
    const filteredCompetitors = competitors.filter(competitor => {
      const meetsViewsThreshold = competitor.viewCount >= viewsThreshold;
      const meetsSubscribersThreshold = competitor.subscriberCount >= subscribersThreshold;
      
      // For view multiplier we'd need data on median views per channel
      // const hasHighMultiplier = competitor.viewMultiplier >= viewMultiplierThreshold;
      
      // For video duration we would need actual data about average video length
      
      // Check if within date range - would need actual data on when added
      // const addedDate = new Date(competitor.addedAt);
      // const isWithinDateRange = addedDate >= new Date(dateRange[0]) && addedDate <= new Date(dateRange[1]);
      
      return meetsViewsThreshold && meetsSubscribersThreshold; // && hasHighMultiplier;
    });
    
    console.log(`Filter applied: Competitors matching criteria: ${filteredCompetitors.length}`);
    // For demo purposes, we're not actually changing the displayed list
    setIsFilterOpen(false);
  }

  // Helper functions to parse filter values
  const parseNumberValue = (value: string): number | null => {
    if (!value) return null;
    
    // Handle "+" suffix
    if (value.includes('+')) {
      value = value.replace('+', '');
    }
    
    // Handle K, M, B suffixes
    if (value.includes('K') || value.includes('k')) {
      return parseFloat(value.replace(/[Kk]/g, '')) * 1000;
    } else if (value.includes('M') || value.includes('m')) {
      return parseFloat(value.replace(/[Mm]/g, '')) * 1000000;
    } else if (value.includes('B') || value.includes('b')) {
      return parseFloat(value.replace(/[Bb]/g, '')) * 1000000000;
    }
    
    return parseFloat(value);
  };
  
  const parseDurationValue = (value: string): number | null => {
    if (!value) return null;
    
    // Handle HH:MM:SS format
    const parts = value.split(':').map(part => parseInt(part));
    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    
    // Handle values with + suffix
    if (value.includes('+')) {
      return parseFloat(value.replace(/\+/g, ''));
    }
    
    return parseFloat(value);
  };
  
  const parseMultiplierValue = (value: string): number | null => {
    if (!value) return null;
    
    // Handle multiplier format (e.g., 5.0x)
    if (value.includes('x')) {
      return parseFloat(value.replace(/x/g, ''));
    }
    
    // Handle values with + suffix
    if (value.includes('+')) {
      return parseFloat(value.replace(/\+/g, ''));
    }
    
    return parseFloat(value);
  };
  
  // Helper function to detect if a video is a YouTube Short
  const isShort = (video: Video): boolean => {
    // YouTube Shorts are typically vertical videos less than 60 seconds
    // This is an approximation based on metadata we have available
    return video.title.toLowerCase().includes('#shorts') || 
           video.description.toLowerCase().includes('#shorts') ||
           video.title.toLowerCase().includes('#short') || 
           video.description.toLowerCase().includes('#short');
  };

  // Updated handleApplyFilters function
  const handleApplyFilters = (filters: any) => {
    console.log('Applying filters:', filters);
    setActiveFilters(filters);
    
    // Close the filter modal
    setIsFilterOpen(false);
    
    // Filter the videos based on the selected criteria
    const filtered = competitorVideos.filter(video => {
      // Filter by content format (Videos vs Shorts)
      if (filters.contentFormat === 'Videos' && isShort(video)) return false;
      if (filters.contentFormat === 'Shorts' && !isShort(video)) return false;
      
      // Filter by views
      if (filters.viewsMin) {
        const minViews = parseNumberValue(filters.viewsMin);
        if (minViews !== null && video.viewCount < minViews) return false;
      }
      
      if (filters.viewsMax && !filters.viewsMax.includes('+')) {
        const maxViews = parseNumberValue(filters.viewsMax);
        if (maxViews !== null && video.viewCount > maxViews) return false;
      }
      
      // Filter by likes (advanced filter)
      if (filters.advancedFilters.videoLikesMin) {
        const minLikes = parseNumberValue(filters.advancedFilters.videoLikesMin);
        if (minLikes !== null && video.likeCount < minLikes) return false;
      }
      
      if (filters.advancedFilters.videoLikesMax && !filters.advancedFilters.videoLikesMax.includes('+')) {
        const maxLikes = parseNumberValue(filters.advancedFilters.videoLikesMax);
        if (maxLikes !== null && video.likeCount > maxLikes) return false;
      }
      
      // Filter by comments (advanced filter)
      if (filters.advancedFilters.videoCommentsMin) {
        const minComments = parseNumberValue(filters.advancedFilters.videoCommentsMin);
        if (minComments !== null && video.commentCount < minComments) return false;
      }
      
      if (filters.advancedFilters.videoCommentsMax && !filters.advancedFilters.videoCommentsMax.includes('+')) {
        const maxComments = parseNumberValue(filters.advancedFilters.videoCommentsMax);
        if (maxComments !== null && video.commentCount > maxComments) return false;
      }
      
      // Filter by time range (when posted)
      if (filters.timeRange !== 'All Time') {
        const videoDate = new Date(video.publishedAt);
        const now = new Date();
        let startDate: Date;
        
        switch (filters.timeRange) {
          case '30 Days':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 30);
            if (videoDate < startDate) return false;
            break;
          case '90 Days':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 90);
            if (videoDate < startDate) return false;
            break;
          case '180 Days':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 180);
            if (videoDate < startDate) return false;
            break;
          case '365 Days':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 365);
            if (videoDate < startDate) return false;
            break;
          case '3 Years':
            startDate = new Date(now);
            startDate.setFullYear(now.getFullYear() - 3);
            if (videoDate < startDate) return false;
            break;
          case 'Custom':
            // For custom range, use the startDate and endDate from filters
            if (filters.startDate && filters.endDate) {
              const customStartDate = new Date(filters.startDate);
              const customEndDate = new Date(filters.endDate);
              if (videoDate < customStartDate || videoDate > customEndDate) return false;
            }
            break;
        }
      }
      
      // Filter by keywords (advanced filter)
      if (filters.advancedFilters.includeKeywords && filters.advancedFilters.includeKeywords.trim() !== '') {
        const keywords = filters.advancedFilters.includeKeywords.split(/[\s,]+/).filter(Boolean);
        if (keywords.length > 0) {
          const hasKeyword = keywords.some((keyword: string) => 
            video.title.toLowerCase().includes(keyword.toLowerCase()) || 
            video.description.toLowerCase().includes(keyword.toLowerCase())
          );
          if (!hasKeyword) return false;
        }
      }
      
      if (filters.advancedFilters.excludeKeywords && filters.advancedFilters.excludeKeywords.trim() !== '') {
        const keywords = filters.advancedFilters.excludeKeywords.split(/[\s,]+/).filter(Boolean);
        if (keywords.length > 0) {
          const hasKeyword = keywords.some((keyword: string) => 
            video.title.toLowerCase().includes(keyword.toLowerCase()) || 
            video.description.toLowerCase().includes(keyword.toLowerCase())
          );
          if (hasKeyword) return false;
        }
      }
      
      return true;
    });
    
    // Sort filtered videos by date (newest first)
    const sortedFiltered = filtered.sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    
    console.log(`Filter applied: Videos matching criteria: ${filtered.length} out of ${competitorVideos.length}`);
    setFilteredCompetitorVideos(sortedFiltered);
  };
  
  // Reset filters function
  const resetFilter = () => {
    setActiveFilters(null);
    // Sort videos by date (newest first) when resetting filters
    const sortedVideos = [...competitorVideos].sort((a, b) => 
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
    setFilteredCompetitorVideos(sortedVideos);
    setIsFilterOpen(false);
  };

  // Helper function to safely parse input values
  const safeParseInt = (value: string, fallback = 0): number => {
    const parsed = parseInt(value);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Helper function to calculate appropriate step based on value range
  const calculateStep = (value: number, min: number, max: number, baseStep: number = 1): number => {
    const range = max - min;
    const percentage = (value - min) / range;
    
    if (percentage < 0.1) return baseStep / 10; // Fine control at the beginning
    if (percentage < 0.3) return baseStep;      // Normal control in lower range
    if (percentage < 0.7) return baseStep * 5;  // Medium control in middle range
    return baseStep * 10;                       // Coarse control in high range
  };

  // Views slider step function - dynamic based on position
  const getViewsStep = (): number => {
    const maxViews = 500000000;
    if (viewsThreshold < 1000000) return 50000;       // 0-1M: steps of 50K
    if (viewsThreshold < 10000000) return 500000;     // 1M-10M: steps of 500K
    if (viewsThreshold < 50000000) return 1000000;    // 10M-50M: steps of 1M
    if (viewsThreshold < 100000000) return 5000000;   // 50M-100M: steps of 5M
    return 10000000;                                  // 100M+: steps of 10M
  };

  // Subscribers slider step function
  const getSubscribersStep = (): number => {
    const maxSubs = 500000000;
    if (subscribersThreshold < 100000) return 5000;       // 0-100K: steps of 5K
    if (subscribersThreshold < 1000000) return 50000;     // 100K-1M: steps of 50K
    if (subscribersThreshold < 10000000) return 500000;   // 1M-10M: steps of 500K
    if (subscribersThreshold < 100000000) return 5000000; // 10M-100M: steps of 5M
    return 10000000;                                      // 100M+: steps of 10M
  };

  // Video duration step function
  const getVideoDurationStep = (): number => {
    if (videoDurationThreshold < 60) return 1;         // 0-1hr: steps of 1 minute
    if (videoDurationThreshold < 180) return 5;        // 1-3hrs: steps of 5 minutes
    if (videoDurationThreshold < 360) return 10;       // 3-6hrs: steps of 10 minutes
    if (videoDurationThreshold < 720) return 30;       // 6-12hrs: steps of 30 minutes
    return 60;                                         // 12hr+: steps of 60 minutes (1 hour)
  };

  // View multiplier step function
  const getViewMultiplierStep = (): number => {
    if (viewMultiplierThreshold < 5) return 0.1;       // 0-5x: steps of 0.1
    if (viewMultiplierThreshold < 20) return 0.5;      // 5-20x: steps of 0.5
    if (viewMultiplierThreshold < 100) return 1;       // 20-100x: steps of 1
    if (viewMultiplierThreshold < 200) return 5;       // 100-200x: steps of 5
    return 10;                                         // 200x+: steps of 10
  };

  // Views slider input change
  const handleViewsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setViewsThreshold(value);
    }
  };

  // Subscribers slider input change
  const handleSubscribersChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setSubscribersThreshold(value);
    }
  };

  // Video duration slider input change
  const handleVideoDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setVideoDurationThreshold(value);
    }
  };

  // View multiplier slider input change
  const handleViewMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setViewMultiplierThreshold(value);
    }
  };

  // Update existing handler for views
  const handleViewsInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseInt(e.target.value, 0);
    setViewsThreshold(Math.min(value, 500000000)); // Cap at 500M
  };

  // Handler for subscribers input
  const handleSubscribersInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = safeParseInt(e.target.value, 0);
    setSubscribersThreshold(Math.min(value, 500000000)); // Cap at 500M
  };

  // Handler for hours input
  const handleHoursInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = safeParseInt(e.target.value, 0);
    const minutes = videoDurationThreshold % 60;
    setVideoDurationThreshold(Math.min(hours, 24) * 60 + minutes); // Cap at 24h
  };

  // Handler for minutes input
  const handleMinutesInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const hours = Math.floor(videoDurationThreshold / 60);
    const minutes = safeParseInt(e.target.value, 0);
    setVideoDurationThreshold(hours * 60 + Math.min(minutes, 59)); // Cap at 59m
  };

  // Handler for view multiplier input
  const handleViewMultiplierInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setViewMultiplierThreshold(Math.max(0, Math.min(value, 500))); // Increased cap to 500x
    }
  };

  // Channel age step function
  const getChannelAgeStep = (): number => {
    if (channelAgeThreshold < 12) return 1;        // 0-12 months: steps of 1 month
    if (channelAgeThreshold < 36) return 3;        // 1-3 years: steps of 3 months
    if (channelAgeThreshold < 60) return 6;        // 3-5 years: steps of 6 months
    return 12;                                     // 5+ years: steps of 1 year
  };

  // Video comments step function
  const getVideoCommentsStep = (): number => {
    if (videoCommentsThreshold < 1000) return 50;
    if (videoCommentsThreshold < 10000) return 500;
    if (videoCommentsThreshold < 100000) return 5000;
    return 10000;
  };

  // Video likes step function
  const getVideoLikesStep = (): number => {
    if (videoLikesThreshold < 1000) return 100;
    if (videoLikesThreshold < 10000) return 500;
    if (videoLikesThreshold < 100000) return 5000;
    return 10000;
  };

  // Video count step function
  const getVideoCountStep = (): number => {
    if (videoCountThreshold < 100) return 5;
    if (videoCountThreshold < 500) return 25;
    if (videoCountThreshold < 1000) return 50;
    return 100;
  };

  // Total channel views step function
  const getTotalChannelViewsStep = (): number => {
    if (totalChannelViewsThreshold < 1000000) return 100000;
    if (totalChannelViewsThreshold < 10000000) return 500000;
    if (totalChannelViewsThreshold < 100000000) return 5000000;
    return 10000000;
  };

  // Handler functions for advanced filters
  const handleChannelAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setChannelAgeThreshold(value);
    }
  };

  const handleVideoCommentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setVideoCommentsThreshold(value);
    }
  };

  const handleVideoLikesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setVideoLikesThreshold(value);
    }
  };

  const handleVideoCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setVideoCountThreshold(value);
    }
  };

  const handleTotalChannelViewsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setTotalChannelViewsThreshold(value);
    }
  };

  // Function to handle changing the video grid layout
  const handleVideoGridColumnsChange = (columns: number) => {
    setVideoGridColumns(columns);
  };

  // Function to toggle video info display
  const toggleVideoInfo = () => {
    setShowVideoInfo(!showVideoInfo);
  };

  // Function to open video on YouTube
  const openVideoOnYouTube = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };
  
  // Function to handle right-click on videos
  const handleVideoContextMenu = (event: React.MouseEvent, videoId: string) => {
    event.preventDefault(); // Prevent the default browser context menu
    setSelectedVideoId(videoId);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowVideoContextMenu(true);
  };

  // Update the filteredVideos definition
  const filteredVideos = activeVideoTab === 'competitors' 
    ? (videoSearchQuery 
        ? filteredCompetitorVideos.filter(video => 
            video.title.toLowerCase().includes(videoSearchQuery.toLowerCase()) || 
            video.description.toLowerCase().includes(videoSearchQuery.toLowerCase()))
        : filteredCompetitorVideos)
    : (videoSearchQuery 
        ? similarVideos.filter(video => 
            video.title.toLowerCase().includes(videoSearchQuery.toLowerCase()) || 
            video.description.toLowerCase().includes(videoSearchQuery.toLowerCase()))
        : similarVideos);
      
  // Removed the channel grouping functionality and renamed to getSortedVideos
  const getSortedVideos = () => {
    return filteredVideos.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        case 'likes':
          return b.likeCount - a.likeCount;
        case 'views':
          return b.viewCount - a.viewCount;
        default:
          return 0;
      }
    });
  };

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
      const formattedResults: ChannelSearchResult[] = data.items.map((item: any) => ({
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
  const selectChannel = (channel: ChannelSearchResult) => {
    setNewCompetitorId(channel.id);
    setChannelSearchQuery(channel.title);
    setChannelSearchResults([]);
  };

  // Handle direct channel ID input changes
  const handleChannelIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCompetitorId(e.target.value);
    // Clear the search query if user is manually entering a channel ID
    if (e.target.value) {
      setChannelSearchQuery('');
      setChannelSearchResults([]);
    }
  };

  // Add this code to correctly handle the SearchFilters component
  const handleOpenFilters = () => {
    setIsFilterOpen(true);
  };

  const handleCloseFilters = () => {
    setIsFilterOpen(false);
  };

  // Add handler for sort change
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as 'date' | 'likes' | 'views');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading channels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/dashboard/competitors" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold dark:text-white">{listName}</h1>
      </div>

      {/* Tracked Channels section (formerly Performance Analytics) */}
      <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <FaYoutube className="text-red-500" />
            <h2 className="text-xl font-bold text-white">
              Tracked Channels <span className="text-white/70 font-normal text-base">({competitors.length})</span>
            </h2>
            <div className="text-white/50 cursor-help" title="Channels you're currently tracking in this list">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* Free tier channel limit indicator */}
            {plan === 'free' && !subscriptionLoading && (
              <div className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-xs border border-amber-500/30">
                {competitors.length}/{FREE_TIER_CHANNEL_LIMIT} channels
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canAddChannel() ? (
              <button 
                className="flex items-center gap-1 bg-white/10 dark:bg-indigo-600/80 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-indigo-700 text-white px-3 py-1.5 rounded-full text-sm transition-colors"
                onClick={openAddChannelModal}
              >
                <FaPlus size={14} />
                <span className="text-xs sm:text-sm">Add channel</span>
              </button>
            ) : (
              <div className="flex flex-col items-end gap-1">
                <button 
                  className="flex items-center gap-1 bg-gray-500/20 text-gray-400 px-3 py-1.5 rounded-full text-sm cursor-not-allowed"
                  disabled
                >
                  <FaLock size={14} />
                  <span className="text-xs sm:text-sm">Channel limit reached</span>
                </button>
                <button 
                  onClick={showChannelUpgradePrompt}
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Channel analytics table with scrolling for >4 channels */}
        <div className={`${competitors.length > 4 ? 'max-h-[400px] overflow-y-auto pr-2' : ''} overflow-x-auto`}>
          <table className="min-w-full">
            <thead className="bg-white/5 dark:bg-[#00264d]/50 backdrop-blur-sm sticky top-0 z-10">
              <tr className="border-b border-white/10 dark:border-blue-400/20">
                <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Channel</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Subscribers</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Videos</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Avg. Views</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Engagement</th>
                <th className="py-3 px-4 text-left text-sm font-medium text-white/70">Growth</th>
                <th className="py-3 px-4 text-right text-sm font-medium text-white/70">Actions</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map(competitor => {
                // Calculate average views per video
                const avgViews = Math.round(competitor.viewCount / Math.max(competitor.videoCount, 1));
                
                return (
                  <tr key={competitor.id} className="border-b border-white/5 dark:border-blue-400/10 hover:bg-white/5 dark:hover:bg-[#00264d]/40">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/10 dark:bg-[#00264d]/50">
                          <img src={competitor.thumbnailUrl} alt={competitor.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <a 
                            href={`https://youtube.com/channel/${competitor.youtubeId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-indigo-300 hover:text-indigo-200 transition-colors"
                          >
                            {competitor.name}
                          </a>
                          <p className="text-xs text-white/50">{competitor.youtubeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center">
                        <span className="font-medium text-white">{formatNumber(competitor.subscriberCount)}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white">{competitor.videoCount.toLocaleString()}</span>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-white">{formatNumber(avgViews)}</span>
                    </td>
                    <td className="py-4 px-4">
                      {/* Generate deterministic engagement rate based on channel ID */}
                      {renderEngagementRate(competitor.youtubeId)}
                    </td>
                    <td className="py-4 px-4">
                      {/* Generate deterministic growth rate based on channel ID */}
                      {renderGrowthRate(competitor.youtubeId)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="relative inline-block">
                        <button 
                          className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                          onClick={() => handleRemoveCompetitor(competitor.id)}
                          title="Remove this channel"
                        >
                          <FaTimes size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {competitors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-white/70">No channels tracked yet.</p>
              <button 
                onClick={openAddChannelModal}
                className="mt-4 bg-white/10 dark:bg-indigo-600/80 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm transition-colors"
              >
                Add your first channel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Suggested competitors section - REMOVED */}

      {/* New Filter Popup */}
      <SearchFilters
        isOpen={isFilterOpen}
        onClose={handleCloseFilters}
        onApply={handleApplyFilters}
        onReset={resetFilter}
        onSavePreset={(name) => console.log('Saving preset:', name)}
      />

      {/* Competitors Grid */}
      <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl shadow-md p-6 mb-8">
      </div>

      {/* Similar Videos Section */}
      <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <FaYoutube className="text-red-500" />
            <h2 className="text-xl font-bold text-white">Channel Videos</h2>
            <div className="text-white/50 cursor-help" title="Videos from competitive channels and similar content">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Video Selection Tabs */}
        <div className="flex mb-4 border-b border-white/10 dark:border-blue-400/20">
          <button
            className="px-4 py-2 text-sm font-medium text-indigo-300 border-b-2 border-indigo-400"
          >
            Channel Videos
          </button>
        </div>
        
        {/* Combined Search and Grid Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center flex-col items-start">
            <div className="flex mb-2">
              <button 
                className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 p-2 rounded-xl text-gray-700 dark:text-gray-300 mr-2 relative"
                onClick={handleOpenFilters}
              >
                <FaFilter size={18} />
                {activeFilters && (
                  <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {(() => {
                      let count = 0;
                      
                      // Count time range only if it's explicitly selected and not 'All Time'
                      if (activeFilters.timeRange && activeFilters.timeRange !== 'All Time') {
                        count++;
                      }
                      
                      // Count basic filters
                      if (activeFilters.viewsMin !== '0') count++;
                      if (activeFilters.viewsMax !== '1M+') count++;
                      if (activeFilters.subscribersMin !== '0') count++;
                      if (activeFilters.subscribersMax !== '1M+') count++;
                      if (activeFilters.videoDurationMin !== '00:00:00') count++;
                      if (activeFilters.videoDurationMax !== '07:00:00+') count++;
                      if (activeFilters.whenPosted) count++;
                      
                      // Count advanced filters
                      if (activeFilters.advancedFilters) {
                        const adv = activeFilters.advancedFilters;
                        if (adv.viewsToSubsRatioMin !== '0.0') count++;
                        if (adv.viewsToSubsRatioMax !== '50.0+') count++;
                        if (adv.medianViewsMin !== '0') count++;
                        if (adv.medianViewsMax !== '10M+') count++;
                        if (adv.channelTotalViewsMin !== '0') count++;
                        if (adv.channelTotalViewsMax !== '1B+') count++;
                        if (adv.channelVideoCountMin !== '0') count++;
                        if (adv.channelVideoCountMax !== '1k+') count++;
                        if (adv.videoLikesMin !== '0') count++;
                        if (adv.videoLikesMax !== '1M+') count++;
                        if (adv.videoCommentsMin !== '0') count++;
                        if (adv.videoCommentsMax !== '100K+') count++;
                        if (adv.engagementRateMin !== '0') count++;
                        if (adv.engagementRateMax !== '20+') count++;
                        if (adv.channelAgeMin !== 'Brand new') count++;
                        if (adv.channelAgeMax !== '20 years ago+') count++;
                        if (adv.includeChannels) count++;
                        if (adv.excludeChannels) count++;
                        if (adv.includeKeywords) count++;
                        if (adv.excludeKeywords) count++;
                      }
                      
                      return count;
                    })()}
                  </span>
                )}
              </button>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search channel videos"
                  value={videoSearchQuery}
                  onChange={(e) => setVideoSearchQuery(e.target.value)}
                  className="w-60 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
            
            {/* Active Filters Display */}
            {activeFilters && (
              <div className="flex flex-wrap items-center gap-2 mt-2 ml-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Active filters:</span>
                
                {activeFilters.contentFormat && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full px-2 py-0.5 flex items-center">
                    {activeFilters.contentFormat}
                    <button 
                      onClick={() => {
                        const newFilters = {...activeFilters, contentFormat: null};
                        handleApplyFilters(newFilters);
                      }}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {activeFilters.timeRange && activeFilters.timeRange !== 'All Time' && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full px-2 py-0.5 flex items-center">
                    {activeFilters.timeRange}
                    <button 
                      onClick={() => {
                        const newFilters = {...activeFilters, timeRange: 'All Time'};
                        handleApplyFilters(newFilters);
                      }}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {activeFilters.viewsMin && activeFilters.viewsMin !== '0' && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full px-2 py-0.5 flex items-center">
                    Min views: {activeFilters.viewsMin}
                    <button 
                      onClick={() => {
                        const newFilters = {...activeFilters, viewsMin: '0'};
                        handleApplyFilters(newFilters);
                      }}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                {(activeFilters.advancedFilters?.includeKeywords || activeFilters.advancedFilters?.excludeKeywords) && (
                  <span className="text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300 rounded-full px-2 py-0.5 flex items-center">
                    Keyword filters
                    <button 
                      onClick={() => {
                        const newFilters = {
                          ...activeFilters, 
                          advancedFilters: {
                            ...activeFilters.advancedFilters,
                            includeKeywords: '',
                            excludeKeywords: ''
                          }
                        };
                        handleApplyFilters(newFilters);
                      }}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      ×
                    </button>
                  </span>
                )}
                
                <button 
                  onClick={resetFilter}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
          
          {/* Grid Controls */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Videos per row:</span>
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                {[1, 2, 3, 4, 5, 6].map((columns) => (
                  <button 
                    key={columns}
                    className={`px-2 py-1 text-sm rounded-md transition-colors ${videoGridColumns === columns ? 'bg-blue-500 text-white' : 'text-gray-700 dark:text-gray-300 hover:text-white hover:bg-blue-500/20'}`}
                    onClick={() => handleVideoGridColumnsChange(columns)}
                  >
                    {columns}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Sort by:</span>
              <select
                value={sortBy}
                onChange={handleSortChange}
                className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-xl text-sm border-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="likes">Likes</option>
                <option value="views">Views</option>
              </select>
            </div>
            
            <button 
              className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-xl text-sm transition-colors"
              onClick={toggleVideoInfo}
              title={showVideoInfo ? "Hide video info" : "Show video info"}
            >
              {showVideoInfo ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              <span className="hidden sm:inline">{showVideoInfo ? "Hide info" : "Show info"}</span>
            </button>
          </div>
        </div>

        {/* Video Grid */}
        {isVideoLoading ? (
          <div className="w-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="ml-4 text-gray-600 dark:text-gray-400">Loading videos...</p>
          </div>
        ) : filteredVideos.length > 0 ? (
          <div>
            {/* Combined video grid */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${videoGridColumns}, minmax(0, 1fr))` }}>
              {getSortedVideos().map((video) => (
                <div 
                  key={video.id} 
                  className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl shadow-sm overflow-hidden hover:bg-white/15 dark:hover:bg-[#00264d]/40 transition-all duration-200 cursor-pointer group"
                  onClick={() => openVideoOnYouTube(video.youtubeId)}
                  onContextMenu={(e) => handleVideoContextMenu(e, video.youtubeId)}
                >
                  <div className="relative pt-[56.25%]"> {/* 16:9 aspect ratio */}
                    <img 
                      src={video.thumbnailUrl} 
                      alt={video.title} 
                      className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-40 transition-opacity duration-300"></div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <FaPlay className="text-white text-4xl" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                      {new Date(video.publishedAt).toLocaleDateString()}
                    </div>
                    {/* Add channel info badge */}
                    <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded-full flex items-center">
                      {competitors.find(c => c.youtubeId === video.channelId)?.name || 'Unknown Channel'}
                    </div>
                  </div>
                  
                  {showVideoInfo && (
                    <div className="p-3">
                      <div className="flex justify-between items-start">
                        <h3 className="font-medium text-white line-clamp-2 mb-1 flex-1">{video.title}</h3>
                        <FaExternalLinkAlt size={12} className="text-white/50 mt-1 ml-2 flex-shrink-0" />
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-xs bg-white/20 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl px-2 py-1">
                          {formatNumber(video.viewCount)} views
                        </span>
                        <span className="text-xs bg-white/20 dark:bg-white/10 text-gray-800 dark:text-gray-200 rounded-xl px-2 py-1">
                          {formatNumber(video.likeCount)} likes
                        </span>
                        
                        {/* VPH with performance level */}
                        {(() => {
                          const outlierData = calculateOutlierScore(video, getSortedVideos());
                          const performanceLevel = outlierData.performanceLevel;
                          return (
                            <span className={`text-xs ${
                              performanceLevel === 'low' ? 'bg-gray-100 dark:bg-gray-900/50 text-gray-800 dark:text-gray-300' : 
                              performanceLevel === 'high' ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300' : 
                              performanceLevel === 'exceptional' ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300' : 
                              'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                            } rounded-xl px-2 py-0.5 font-medium inline-flex items-center`}>
                              {formatNumber(video.vph)} VPH
                              {performanceLevel === 'exceptional' && <span className="ml-1">🔥</span>}
                            </span>
                          );
                        })()}
                        
                        {/* Outlier Score Badge */}
                        {(() => {
                          const outlierData = calculateOutlierScore(video, getSortedVideos());
                          const xColor = outlierData.xFactor > 1.2 ? 'bg-blue-200 text-blue-800' : 
                                        outlierData.xFactor < 0.8 ? 'bg-red-200 text-red-800' : 
                                        'bg-gray-200 text-gray-800';
                          
                          return (
                            <span className={`text-xs font-bold rounded-xl px-2 py-0.5 ${xColor} inline-flex items-center`}>
                              {outlierData.xFactor.toFixed(1)}x
                            </span>
                          );
                        })()}
                        
                        {/* Performance Score Badge */}
                        {(() => {
                          const performanceScore = calculatePerformanceScore(video, getSortedVideos());
                          return (
                            <span className="text-xs font-bold rounded-xl px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 inline-flex items-center">
                              {Math.round(performanceScore)} Score
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {videoSearchQuery 
                ? "No videos found matching your search." 
                : competitors.length > 0
                  ? "No videos found for your tracked competitors."
                  : "Videos from your tracked competitors will appear here. Add competitors to the Tracked Channels section above."}
            </p>
            {videoSearchQuery && (
              <button
                onClick={() => setVideoSearchQuery('')}
                className="text-indigo-600 dark:text-indigo-400 underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Competitor Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={(e) => e.stopPropagation()}
        >
          <div 
            className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-md border border-white/10 dark:border-blue-400/20 rounded-xl w-full max-w-md p-6 relative shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-white/60 hover:text-white"
            >
              <FaTimes size={20} />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">
              Add New Competitor
            </h3>
            <form onSubmit={handleAddCompetitor}>
              <div className="mb-4">
                <label htmlFor="channelSearch" className="block text-white/80 text-sm mb-2">
                  Search for a YouTube Channel:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="channelSearch"
                    value={channelSearchQuery}
                    onChange={(e) => setChannelSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 dark:border-blue-400/30 text-white rounded-xl py-2 px-3 pl-10 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-sm"
                    placeholder="Enter channel name..."
                    autoFocus
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2">
                      <svg className="animate-spin h-5 w-5 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/60">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  
                  {/* Only show search results if there are results AND user hasn't selected a channel yet */}
                  {channelSearchResults.length > 0 && !newCompetitorId && (
                    <div className="absolute z-10 w-full mt-1 bg-white/10 dark:bg-[#00264d]/80 backdrop-blur-md border border-white/10 dark:border-blue-400/20 rounded-md shadow-lg">
                      <ul className="max-h-60 overflow-y-auto">
                        {channelSearchResults.map((channel) => (
                          <li 
                            key={channel.id}
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent event from bubbling up
                              selectChannel(channel);
                            }}
                            className="flex items-center p-3 hover:bg-white/10 dark:hover:bg-[#00264d]/50 cursor-pointer"
                          >
                            <img 
                              src={channel.thumbnailUrl} 
                              alt={channel.title} 
                              className="w-10 h-10 rounded-full mr-3"
                            />
                            <div>
                              <p className="font-medium text-white">{channel.title}</p>
                              <p className="text-sm text-white/60 truncate">{channel.description}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <p className="mt-1 text-sm text-white/60">
                  Search for a YouTube channel by name to find and track competitors
                </p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="youtubeId" className="block text-white/80 text-sm mb-2">
                  Or enter YouTube Channel ID directly:
                </label>
                <input 
                  type="text"
                  id="youtubeId"
                  value={newCompetitorId}
                  onChange={handleChannelIdChange}
                  className="w-full bg-white/5 border border-white/10 dark:border-blue-400/30 text-white rounded-xl py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 backdrop-blur-sm"
                  placeholder="e.g. UC_x5XG1OV2P6uZZ5FSM9Ttw"
                />
                <p className="mt-1 text-sm text-white/60">
                  Channel ID is in the format 'UC_x5XG1OV2P6uZZ5FSM9Ttw'.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 backdrop-blur-sm border-l-4 border-red-500 p-4 mb-4 rounded-r-xl">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-transparent text-white/70 hover:text-white px-4 py-2 rounded-full mr-2"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isAdding || (!newCompetitorId.trim() && !channelSearchQuery.trim())}
                  className="bg-white/10 dark:bg-indigo-600/80 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-indigo-700 text-white px-4 py-2 rounded-full disabled:opacity-50 transition-colors"
                >
                  {isAdding ? 'Adding...' : 'Add Competitor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Video Context Menu */}
      {showVideoContextMenu && (
        <div 
          ref={contextMenuRef}
          className="fixed shadow-lg bg-white/10 dark:bg-[#00264d]/80 backdrop-blur-md border border-white/10 dark:border-blue-400/20 rounded-lg py-2 z-50"
          style={{ 
            top: `${contextMenuPosition.y}px`, 
            left: `${contextMenuPosition.x}px`,
            minWidth: '180px'
          }}
        >
          <div className="px-3 py-1 text-sm font-medium text-white/60 border-b border-white/10 dark:border-blue-400/20 mb-1">
            Video Options
          </div>
          
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={() => {
              if (selectedVideoId) openVideoOnYouTube(selectedVideoId);
              setShowVideoContextMenu(false);
            }}
          >
            <FaExternalLinkAlt size={14} />
            Open in YouTube
          </button>
          
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={() => {
              alert('Feature not yet implemented');
              setShowVideoContextMenu(false);
            }}
          >
            <FaBookmark size={14} />
            Save for later
          </button>
          
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={() => {
              alert('Feature not yet implemented');
              setShowVideoContextMenu(false);
            }}
          >
            <FaClipboard size={14} />
            Copy link
          </button>
          
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={() => {
              alert('Feature not yet implemented');
              setShowVideoContextMenu(false);
            }}
          >
            <FaChartLine size={14} />
            Analyze performance
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={(e) => e.target === e.currentTarget && setShowUpgradeModal(false)}
        >
          <div className="bg-[#00264d]/90 backdrop-blur-md border border-blue-400/20 rounded-xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-amber-500/20 mb-4">
                <FaCrown className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium text-white mb-2">
                Channel Limit Reached
              </h3>
              <p className="text-sm text-gray-300 mb-6">
                You have reached your competitor limit on the Free plan. Upgrade to Pro to track more competitors.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white/80 hover:bg-[#02386e]/50 rounded-full border border-white/20"
                >
                  Cancel
                </button>
                <Link 
                  href="/subscription"
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600/80 hover:bg-blue-600 rounded-full text-center"
                >
                  Upgrade to Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}