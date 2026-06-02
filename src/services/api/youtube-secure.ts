import { Video, Channel, VideoMetadata } from '@/types';
import { IYouTubeService } from './interfaces';
import { attachSqlOutlierScores } from '@/services/metrics/outlier-sync';

// Format a YouTube video API response to our app's Video type
const formatVideo = (item: any): Video => {
  const { id, snippet, statistics = {}, contentDetails } = item;

  return {
    id: id,
    youtubeId: id,
    channelId: snippet.channelId,
    title: snippet.title,
    description: snippet.description,
    thumbnailUrl: snippet.thumbnails.medium.url,
    publishedAt: new Date(snippet.publishedAt),
    viewCount: parseInt(statistics.viewCount || '0'),
    likeCount: parseInt(statistics.likeCount || '0'),
    commentCount: parseInt(statistics.commentCount || '0'),
    vph: calculateVPH(parseInt(statistics.viewCount || '0'), snippet.publishedAt),
    durationIso: contentDetails?.duration ?? null,
  };
};

// Calculate views per hour (simple estimate)
const calculateVPH = (viewCount: number, publishedAt: string): number => {
  const publishDate = new Date(publishedAt);
  const now = new Date();
  const hoursElapsed = Math.max(1, Math.floor((now.getTime() - publishDate.getTime()) / (1000 * 60 * 60)));
  return Math.round(viewCount / hoursElapsed);
};

// Format a YouTube channel API response to our app's Channel type
const formatChannel = (item: any): Channel => {
  const { id, snippet, statistics } = item;
  
  return {
    id: id,
    youtubeId: id,
    name: snippet.title,
    description: snippet.description,
    thumbnailUrl: snippet.thumbnails.medium.url,
    subscriberCount: parseInt(statistics.subscriberCount) || 0,
    videoCount: parseInt(statistics.videoCount) || 0,
    viewCount: parseInt(statistics.viewCount) || 0
  };
};

// YouTube API service implementation using server-side API routes
export const secureYoutubeService: IYouTubeService = {
  // Test API key to make sure it's working
  testApiKey: async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/youtube/videos?maxResults=1');
      return response.ok;
    } catch (error) {
      console.error('API key test failed:', error);
      return false;
    }
  },
  
  // Channel functions
  getChannelById: async (channelId: string): Promise<Channel> => {
    try {
      const response = await fetch(`/api/youtube/channels?id=${channelId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch channel: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return formatChannel(data.items[0]);
      }
      
      throw new Error('Channel not found');
    } catch (error) {
      console.error('Error fetching channel:', error);
      throw error;
    }
  },
  
  getChannelIdByUsername: async (username: string): Promise<string> => {
    try {
      const response = await fetch(`/api/youtube/channels?username=${username}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch channel by username: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items[0].id;
      }
      
      throw new Error('Channel not found');
    } catch (error) {
      console.error('Error getting channel ID:', error);
      throw error;
    }
  },
  
  searchChannels: async (query: string): Promise<Channel[]> => {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        type: 'channel',
        maxResults: '5'
      });
      
      const response = await fetch(`/api/youtube/search?${searchParams}`);
      
      if (!response.ok) {
        throw new Error(`Failed to search channels: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.items || data.items.length === 0) {
        return [];
      }
      
      // Get channel IDs
      const channelIds = data.items
        .map((item: any) => item.id.channelId)
        .join(',');
      
      // Get detailed channel information
      const channelsResponse = await fetch(`/api/youtube/channels?id=${channelIds}`);
      
      if (!channelsResponse.ok) {
        throw new Error(`Failed to fetch channel details: ${channelsResponse.statusText}`);
      }
      
      const channelsData = await channelsResponse.json();
      
      if (channelsData.items && channelsData.items.length > 0) {
        return channelsData.items.map(formatChannel);
      }
      
      return [];
    } catch (error) {
      console.error('Error searching channels:', error);
      throw error;
    }
  },
  
  // Video functions
  getVideoById: async (videoId: string): Promise<Video> => {
    try {
      const response = await fetch(`/api/youtube/videos?id=${videoId}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return formatVideo(data.items[0]);
      }
      
      throw new Error('Video not found');
    } catch (error) {
      console.error('Error fetching video:', error);
      throw error;
    }
  },
  
  getVideosByChannelId: async (channelId: string, maxResults = 10): Promise<Video[]> => {
    try {
      const response = await fetch(`/api/youtube/videos?channelId=${channelId}&maxResults=${maxResults}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch channel videos: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const videos = data.items.map(formatVideo);
        return attachSqlOutlierScores(videos, channelId);
      }

      return [];
    } catch (error) {
      console.error('Error fetching channel videos:', error);
      throw error;
    }
  },
  
  getTopVideos: async (maxResults = 10): Promise<Video[]> => {
    try {
      const response = await fetch(`/api/youtube/videos?maxResults=${maxResults}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch top videos: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        return data.items.map(formatVideo);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top videos:', error);
      throw error;
    }
  },
  
  searchVideos: async (query: string, maxResults = 10): Promise<Video[]> => {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        type: 'video',
        maxResults: maxResults.toString()
      });
      
      const searchResponse = await fetch(`/api/youtube/search?${searchParams}`);
      
      if (!searchResponse.ok) {
        throw new Error(`Failed to search videos: ${searchResponse.statusText}`);
      }
      
      const searchData = await searchResponse.json();
      
      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }
      
      // Extract video IDs
      const videoIds = searchData.items
        .map((item: any) => item.id.videoId)
        .join(',');
      
      // Get detailed video information
      const videoResponse = await fetch(`/api/youtube/videos?id=${videoIds}`);
      
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video details: ${videoResponse.statusText}`);
      }
      
      const videoData = await videoResponse.json();
      
      if (videoData.items && videoData.items.length > 0) {
        return videoData.items.map(formatVideo);
      }
      
      return [];
    } catch (error) {
      console.error('Error searching videos:', error);
      throw error;
    }
  },
  
  // Metadata functions
  getVideoMetadata: async (videoId: string): Promise<VideoMetadata> => {
    try {
      const response = await fetch(`/api/youtube/videos?id=${videoId}&part=snippet,contentDetails,status,topicDetails`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch video metadata: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        const { snippet, contentDetails, status } = item;
        
        return {
          id: videoId,
          videoId: videoId,
          tags: snippet.tags || [],
          category: snippet.categoryId || '',
          language: snippet.defaultLanguage || snippet.defaultAudioLanguage || 'en',
          madeForKids: contentDetails.madeForKids || false,
          privacyStatus: status.privacyStatus || 'public',
          dimension: contentDetails.dimension || '2d',
          definition: contentDetails.definition || 'hd',
          caption: contentDetails.caption === 'true',
          licensedContent: contentDetails.licensedContent || false,
          contentRating: contentDetails.contentRating || {}
        };
      }
      
      throw new Error('Video metadata not found');
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      throw error;
    }
  }
}; 