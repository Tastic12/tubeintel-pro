'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FaArrowLeft, FaPlus, FaTimes, FaYoutube, FaEllipsisV, FaChartBar, FaDownload, FaFilter, FaChevronDown, FaStar, FaRocket, FaTrophy, FaCheck, FaCalendarAlt, FaEye, FaEyeSlash, FaThLarge, FaSearch, FaExternalLinkAlt, FaPlay, FaBookmark, FaClipboard, FaChartLine, FaListUl, FaTh, FaInfoCircle, FaRegClock, FaLink, FaCrown, FaLock } from 'react-icons/fa';
import Link from 'next/link';
import { Video } from '@/types';
import { useSubscription } from '@/hooks/useSubscription';
import { secureYoutubeService } from '@/services/api/youtube-secure';
import { videoCollectionsApi } from '@/services/api/videoCollections';
import { calculateOutlierScore, calculatePerformanceScore } from '@/services/metrics/outliers';
import { useShortsPreference } from '@/lib/preferences';
import { filterVideosByShortsPreference } from '@/lib/video-short';
import SearchFilters, { type SearchFiltersResult } from '@/components/SearchFilters';
import VideoListToolbar from '@/components/VideoListToolbar';
import { applyVideoSearchFilters } from '@/lib/apply-video-filters';
import { getChannelMetaFromVideo } from '@/lib/video-channel-meta';
import {
  useCollectionVideos,
  invalidateVideoCollectionsData,
} from '@/lib/hooks';

// Format number to compact form
const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
};

export default function VideoCollectionDetail({ params }: { params: { listId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const collectionName = searchParams.get('name') || 'Video Collection';
  const { plan, isSubscribed } = useSubscription();
  const { hideShorts, mounted } = useShortsPreference();
  const {
    videos,
    isLoading,
    mutate: mutateVideos,
  } = useCollectionVideos(params.listId);

  const [showVideoInfo, setShowVideoInfo] = useState(true);
  const [gridColumns, setGridColumns] = useState(3);
  const [showVideoContextMenu, setShowVideoContextMenu] = useState(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [error, setError] = useState<string>('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'likes' | 'views'>('date');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<SearchFiltersResult | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Free tier limits
  const FREE_TIER_VIDEOS_PER_COLLECTION = 10;

  // Function to extract YouTube video ID from various URL formats
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    return null;
  };

  // Fetch videos for this collection — handled by useCollectionVideos

  // Check if user can add more videos
  const canAddVideo = () => {
    if (isSubscribed) return true;
    return videos.length < FREE_TIER_VIDEOS_PER_COLLECTION;
  };

  // Show upgrade prompt for video limit
  const showVideoUpgradePrompt = () => {
    setShowUpgradeModal(true);
  };

  // Handle adding video by URL
  const handleAddVideo = async () => {
    if (!youtubeUrl.trim()) {
      setError('Please enter a YouTube URL');
      return;
    }

    // Check if user can add more videos
    if (!canAddVideo()) {
      showVideoUpgradePrompt();
      return;
    }

    const videoId = extractYouTubeVideoId(youtubeUrl.trim());
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    try {
      setIsAddingVideo(true);
      setError('');

      // Get video data from YouTube API
      console.log('Fetching video data for:', videoId);
      const videoData = await secureYoutubeService.getVideoById(videoId);

      let channelData = null;
      if (videoData.channelId) {
        try {
          channelData = await secureYoutubeService.getChannelById(videoData.channelId);
        } catch {
          // Channel stats are optional for saving the video
        }
      }

      console.log('Video data received:', videoData);

      // Add to collection in Supabase
      console.log('Adding video to collection:', params.listId);
      const trackedVideo = await videoCollectionsApi.addVideoToCollection(
        params.listId,
        {
          youtubeId: videoData.youtubeId,
          title: videoData.title,
          thumbnailUrl: videoData.thumbnailUrl,
          channelName: channelData?.name || '',
          channelId: videoData.channelId,
          duration: videoData.durationIso ?? '',
          viewCount: videoData.viewCount,
          likeCount: videoData.likeCount,
          publishedAt: videoData.publishedAt.toISOString(),
          description: videoData.description,
          commentCount: videoData.commentCount,
          channelSubscriberCount: channelData?.subscriberCount,
          channelVideoCount: channelData?.videoCount,
          channelViewCount: channelData?.viewCount,
          channelPublishedAt: channelData?.publishedAt
            ? channelData.publishedAt.toISOString()
            : undefined,
        }
      );
      
      console.log('Video added successfully:', trackedVideo);
      
      // Convert to our app format and add to state
      const newVideo: Video = {
        id: trackedVideo.id,
        youtubeId: trackedVideo.youtubeId,
        channelId: trackedVideo.channelId || '',
        title: trackedVideo.title,
        description: trackedVideo.description || videoData.description || '',
        thumbnailUrl: trackedVideo.thumbnailUrl || '',
        publishedAt: trackedVideo.publishedAt ? new Date(trackedVideo.publishedAt) : new Date(),
        viewCount: trackedVideo.viewCount || 0,
        likeCount: trackedVideo.likeCount || 0,
        commentCount: trackedVideo.commentCount ?? videoData.commentCount ?? 0,
        vph: 0,
        durationIso: trackedVideo.duration || videoData.durationIso || null,
        channelName: trackedVideo.channelName,
        channelSubscriberCount: trackedVideo.channelSubscriberCount,
        channelVideoCount: trackedVideo.channelVideoCount,
        channelViewCount: trackedVideo.channelViewCount,
        channelPublishedAt: trackedVideo.channelPublishedAt
          ? new Date(trackedVideo.channelPublishedAt)
          : channelData?.publishedAt ?? null,
      };
      
      void mutateVideos(
        (current) => [...(current ?? []), newVideo],
        { revalidate: false }
      );
      void invalidateVideoCollectionsData();
      setYoutubeUrl(''); // Clear the input
    } catch (apiError) {
      console.error('Error adding video to Supabase:', apiError);
      if (apiError instanceof Error) {
        if (apiError.message.includes('already in your collection')) {
          setError('This video is already in your collection');
        } else {
          setError(`Failed to save video: ${apiError.message}`);
        }
      } else {
        setError('Failed to save video. Please try again.');
      }
    } finally {
      setIsAddingVideo(false);
    }
  };

  const removeVideoFromCollection = async (videoId: string) => {
    try {
      // Remove the video using the API
      await videoCollectionsApi.removeVideoFromCollection(videoId);
      
      void mutateVideos(
        (current) => (current ?? []).filter((video) => video.id !== videoId),
        { revalidate: false }
      );
      void invalidateVideoCollectionsData();
    } catch (error) {
      console.error('Error removing video:', error);
      setError('Failed to remove video');
    }
  };

  // Function to handle right-click on videos
  const handleVideoContextMenu = (event: React.MouseEvent, videoId: string) => {
    event.preventDefault();
    setSelectedVideoId(videoId);
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setShowVideoContextMenu(true);
  };

  // Function to open video on YouTube
  const openVideoOnYouTube = (videoId: string) => {
    window.open(`https://www.youtube.com/watch?v=${videoId}`, '_blank');
  };

  const handleApplyFilters = (filters: SearchFiltersResult) => {
    setActiveFilters(filters);
    setIsFilterOpen(false);
  };

  const handleFilterPatch = (patch: Partial<SearchFiltersResult>) => {
    if (!activeFilters) return;
    handleApplyFilters({
      ...activeFilters,
      ...patch,
      advancedFilters: patch.advancedFilters
        ? { ...activeFilters.advancedFilters, ...patch.advancedFilters }
        : activeFilters.advancedFilters,
    });
  };

  const resetFilter = () => {
    setActiveFilters(null);
    setIsFilterOpen(false);
  };

  const getChannelForVideo = useCallback(
    (video: Video) => getChannelMetaFromVideo(video),
    []
  );

  const displayVideos = useMemo(() => {
    let list = applyVideoSearchFilters(videos, activeFilters, {
      getChannelForVideo,
      comparisonPool: videos,
    });

    if (videoSearchQuery.trim()) {
      const query = videoSearchQuery.toLowerCase();
      list = list.filter(
        (video) =>
          video.title.toLowerCase().includes(query) ||
          video.description.toLowerCase().includes(query)
      );
    }

    list = filterVideosByShortsPreference(list, mounted ? hideShorts : true);

    return [...list].sort((a, b) => {
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
  }, [videos, activeFilters, getChannelForVideo, videoSearchQuery, hideShorts, mounted, sortBy]);

  // Close context menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowVideoContextMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading video collection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex items-center mb-8">
        <Link href="/dashboard/videos" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3">
          <FaArrowLeft size={18} />
        </Link>
        <h1 className="text-2xl font-bold dark:text-white">{collectionName}</h1>
      </div>

      {/* Video Collection section */}
      <div className="bg-white/10 dark:bg-[#00264d]/30 backdrop-blur-sm border border-white/10 dark:border-blue-400/20 rounded-xl shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <FaPlay className="text-red-500" />
            <h2 className="text-xl font-bold text-white">
              Saved Videos <span className="text-white/70 font-normal text-base">({videos.length})</span>
            </h2>
            <div className="text-white/50 cursor-help" title="Videos you've saved in this collection">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            {/* Free tier video limit indicator */}
            {plan === 'free' && (
              <div className="bg-amber-500/20 text-amber-300 px-2 py-1 rounded text-xs border border-amber-500/30">
                {videos.length}/{FREE_TIER_VIDEOS_PER_COLLECTION} videos
              </div>
            )}
          </div>
        </div>
        
        {/* YouTube URL Input and Grid Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* YouTube URL Input */}
          <div className="flex-1">
            <div className="relative">
              <FaYoutube className="absolute left-3 top-1/2 transform -translate-y-1/2 text-red-500" size={16} />
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddVideo()}
                placeholder="Paste YouTube URL here to add video..."
                className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isAddingVideo}
              />
              <button
                onClick={handleAddVideo}
                disabled={isAddingVideo || !canAddVideo()}
                className={`absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1 px-2 py-1.5 rounded-xl transition-colors ${
                  canAddVideo() && !isAddingVideo
                    ? 'bg-white/10 dark:bg-indigo-600/80 backdrop-blur-sm hover:bg-white/20 dark:hover:bg-indigo-700 text-white'
                    : 'bg-gray-500/20 text-gray-400 cursor-not-allowed'
                }`}
                title={canAddVideo() ? 'Add video' : `Free plan allows only ${FREE_TIER_VIDEOS_PER_COLLECTION} videos per collection`}
              >
                {isAddingVideo ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FaPlus size={14} />
                    <span className="text-xs sm:text-sm">Add video</span>
                  </>
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </div>
        </div>

        <VideoListToolbar
          searchQuery={videoSearchQuery}
          onSearchChange={setVideoSearchQuery}
          searchPlaceholder="Search saved videos…"
          activeFilters={activeFilters}
          onOpenFilters={() => setIsFilterOpen(true)}
          onClearFilters={resetFilter}
          onRemoveFilterPatch={handleFilterPatch}
          sortBy={sortBy}
          onSortChange={setSortBy}
          gridColumns={gridColumns}
          onGridColumnsChange={setGridColumns}
          gridOptions={[2, 3, 4, 5]}
          showVideoInfo={showVideoInfo}
          onToggleVideoInfo={() => setShowVideoInfo(!showVideoInfo)}
        />

        <SearchFilters
          isOpen={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          onApply={handleApplyFilters}
          onReset={resetFilter}
        />

        {/* Videos Grid */}
        {videos.length === 0 ? (
          <div className="text-center py-12">
            <FaPlay className="mx-auto text-white/30 mb-4" size={48} />
            <h3 className="text-white/70 text-lg mb-2">No videos yet</h3>
            <p className="text-white/50 text-sm">
              Add your first video by pasting a YouTube URL above
            </p>
          </div>
        ) : displayVideos.length === 0 ? (
          <div className="text-center py-12">
            <FaPlay className="mx-auto text-white/30 mb-4" size={48} />
            <h3 className="text-white/70 text-lg mb-2">No videos found</h3>
            <p className="text-white/50 text-sm mb-4">
              No videos match your search criteria
            </p>
            <button
              onClick={() => {
                setVideoSearchQuery('');
                resetFilter();
              }}
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Clear search & filters
            </button>
          </div>
        ) : (
          <div 
            className={`grid gap-4`}
            style={{ gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))` }}
          >
            {displayVideos.map((video) => (
              <div
                key={video.id}
                className="group relative bg-white/5 rounded-xl overflow-hidden hover:bg-white/10 transition-colors"
                onContextMenu={(e) => handleVideoContextMenu(e, video.id)}
              >
                {/* Video Thumbnail */}
                <div className="relative aspect-video">
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Play overlay */}
                  <div 
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
                    onClick={() => openVideoOnYouTube(video.youtubeId)}
                  >
                    <FaPlay className="text-white text-2xl" />
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      await removeVideoFromCollection(video.id);
                    }}
                    className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    title="Remove from collection"
                  >
                    <FaTimes size={12} />
                  </button>
                  
                  {/* Published date badge */}
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </div>
                </div>

                {/* Video Info */}
                {showVideoInfo && (
                  <div className="p-3">
                    <div className="flex justify-between items-start">
                      <h4 className="text-white text-sm font-medium line-clamp-2 mb-2 flex-1">
                        {video.title}
                      </h4>
                      <FaExternalLinkAlt size={12} className="text-white/50 mt-1 ml-2 flex-shrink-0" />
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-white/20 text-white rounded-xl px-2 py-1">
                        {formatNumber(video.viewCount)} views
                      </span>
                      <span className="text-xs bg-white/20 text-white rounded-xl px-2 py-1">
                        {formatNumber(video.likeCount)} likes
                      </span>
                      
                      {/* VPH with performance level */}
                      {(() => {
                        const outlierData = calculateOutlierScore(video, displayVideos);
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
                        const outlierData = calculateOutlierScore(video, displayVideos);
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
                        const performanceScore = calculatePerformanceScore(video, displayVideos);
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
        )}
      </div>

      {/* Context Menu */}
      {showVideoContextMenu && selectedVideoId && (
        <div
          ref={contextMenuRef}
          className="fixed bg-[#00264d]/90 backdrop-blur-md border border-blue-400/20 rounded-xl shadow-lg py-2 z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
        >
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={() => {
              if (selectedVideoId) {
                const video = videos.find(v => v.id === selectedVideoId);
                if (video) {
                  openVideoOnYouTube(video.youtubeId);
                }
              }
              setShowVideoContextMenu(false);
            }}
          >
            <FaExternalLinkAlt size={14} />
            Open on YouTube
          </button>
          
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-white hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={() => {
              if (selectedVideoId) {
                const video = videos.find(v => v.id === selectedVideoId);
                if (video) {
                  navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${video.youtubeId}`);
                }
              }
              setShowVideoContextMenu(false);
            }}
          >
            <FaLink size={14} />
            Copy link
          </button>
          
          <button 
            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-white/10 dark:hover:bg-[#00264d]/50 transition-colors text-left"
            onClick={async () => {
              if (selectedVideoId) {
                await removeVideoFromCollection(selectedVideoId);
              }
              setShowVideoContextMenu(false);
            }}
          >
            <FaTimes size={14} />
            Remove from collection
          </button>
        </div>
      )}

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#00264d]/90 backdrop-blur-md border border-blue-400/20 rounded-xl p-6 max-w-md mx-4">
            <div className="text-center">
              <FaCrown className="mx-auto text-yellow-500 mb-4" size={48} />
              <h3 className="text-lg font-medium text-white mb-2">Video Limit Reached</h3>
              <p className="text-sm text-gray-300 mb-6">
                You have reached your video limit on the Free plan. Upgrade to Pro to save unlimited videos.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
                >
                  Cancel
                </button>
                <Link
                  href="/dashboard/billing"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center"
                >
                  Upgrade Now
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 