import { User, Channel, Video, Alert, Competitor, Transcript, VideoMetadata, Insight, Profile } from '@/types';
import { 
  mockUsers, 
  mockChannels, 
  mockVideos, 
  mockAlerts, 
  mockCompetitors, 
  mockTranscripts, 
  mockMetadata,
  mockInsights 
} from './mockData';
import { secureYoutubeService as youtubeApiService } from './youtube-secure';
import { competitorListsApi } from './competitorLists';
import { getCurrentUser } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';
import { getChannelWithCache, getChannelIdForVideos, clearChannelCache } from './optimized-channels';

// Auth API
const authApi = {
  login: async (username: string, password: string): Promise<User> => {
    // For demo purposes, always return successful login with mock user
    if (username && password) {
      return mockUsers[0];
    }
    throw new Error('Invalid credentials');
  },
  
  logout: async (): Promise<void> => {
    // Simulated logout
    return;
  },
  
  getCurrentUser: async (): Promise<User | null> => {
    // For demo purposes, always return the mock user
    return mockUsers[0];
  }
};

// Channels API
const channelsApi = {
  getMyChannel: async (): Promise<Channel> => {
    try {
      // Use the optimized cached version
      return await getChannelWithCache();
    } catch (error) {
      console.error('Error fetching channel from YouTube API:', error);
      throw error;
    }
  },
  
  updateChannel: async (channelId: string, data: Partial<Channel>): Promise<Channel> => {
    try {
      // Validate the channel exists
      const channel = await youtubeApiService.getChannelById(channelId);
      return { ...channel, ...data };
    } catch (error) {
      console.error('Error updating channel:', error);
      throw error;
    }
  }
};

// Videos API
const videosApi = {
  getAllVideos: async (): Promise<Video[]> => {
    const channelId = await getChannelIdForVideos();
    return youtubeApiService.getVideosByChannelId(channelId);
  },
  
  getVideoById: async (id: string): Promise<Video | null> => {
    return youtubeApiService.getVideoById(id);
  },
  
  getRecentVideos: async (limit: number = 5): Promise<Video[]> => {
    const channelId = await getChannelIdForVideos();
    const videos = await youtubeApiService.getVideosByChannelId(channelId, limit);
    return videos.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  },
  
  getTopPerformingVideos: async (limit: number = 5): Promise<Video[]> => {
    return youtubeApiService.getTopVideos(limit);
  }
};

// Alerts API
const alertsApi = {
  getAllAlerts: async (): Promise<Alert[]> => {
    return mockAlerts;
  },
  
  getUnreadAlerts: async (): Promise<Alert[]> => {
    return mockAlerts.filter(alert => !alert.read);
  },
  
  markAlertAsRead: async (alertId: string): Promise<Alert> => {
    const alert = mockAlerts.find(a => a.id === alertId);
    if (!alert) throw new Error('Alert not found');
    return { ...alert, read: true };
  },
  
  createAlert: async (data: Omit<Alert, 'id' | 'createdAt' | 'read'>): Promise<Alert> => {
    return {
      id: `${mockAlerts.length + 1}`,
      ...data,
      createdAt: new Date(),
      read: false
    };
  }
};

// Competitors API
const competitorsApi = {
  getAllCompetitors: async (): Promise<Competitor[]> => {
    return mockCompetitors;
  },
  
  getCompetitorById: async (id: string): Promise<Competitor | null> => {
    return mockCompetitors.find(competitor => competitor.id === id) || null;
  },
  
  addCompetitor: async (data: Omit<Competitor, 'id'>): Promise<Competitor> => {
    try {
      // Get actual channel data from YouTube
      const channelData = await youtubeApiService.getChannelById(data.youtubeId);
      // Use the data from YouTube API but keep our app's ID system
      return {
        id: `${mockCompetitors.length + 1}`,
        youtubeId: channelData.youtubeId,
        name: channelData.name,
        thumbnailUrl: channelData.thumbnailUrl,
        subscriberCount: channelData.subscriberCount,
        videoCount: channelData.videoCount,
        viewCount: channelData.viewCount
      };
    } catch (error) {
      console.error('Error adding competitor from YouTube API:', error);
      // Fallback if API fails
      return {
        id: `${mockCompetitors.length + 1}`,
        ...data
      };
    }
  },
  
  removeCompetitor: async (id: string): Promise<void> => {
    // In a real app, we would remove the competitor
    return;
  }
};

// Transcripts API
const transcriptsApi = {
  getTranscriptForVideo: async (videoId: string): Promise<Transcript | null> => {
    return mockTranscripts.find(transcript => transcript.videoId === videoId) || null;
  }
};

// Metadata API
const metadataApi = {
  getMetadataForVideo: async (videoId: string): Promise<VideoMetadata | null> => {
    try {
      return await youtubeApiService.getVideoMetadata(videoId);
    } catch (error) {
      console.error('Error fetching video metadata from YouTube API:', error);
      return mockMetadata.find(metadata => metadata.videoId === videoId) || null;
    }
  }
};

// Insights API
const insightsApi = {
  getInsightsForVideo: async (videoId: string): Promise<Insight | null> => {
    // Currently insights are only available in mock data
    return mockInsights.find(insight => insight.videoId === videoId) || null;
  },
  
  getInsightsForChannel: async (channelId: string): Promise<Insight[]> => {
    // Get insights related to a specific channel
    return mockInsights.filter(insight => insight.channelId === channelId);
  },
  
  generateInsight: async (videoId: string, type: string): Promise<Insight> => {
    // In a real app, this would analyze data and generate an insight
    return {
      id: `${mockInsights.length + 1}`,
      videoId,
      channelId: '1', // Assuming for the demo
      type: type as any,
      summary: 'Auto-generated insight based on recent performance metrics.',
      details: {
        strengths: ['Generated strength 1', 'Generated strength 2'],
        improvements: ['Generated improvement 1', 'Generated improvement 2'],
        trends: ['Generated trend 1', 'Generated trend 2']
      },
      createdAt: new Date()
    };
  }
};

// Export all APIs together (ensures no duplicate exports)
export { 
  authApi,
  channelsApi,
  videosApi,
  alertsApi,
  competitorsApi,
  transcriptsApi,
  metadataApi,
  insightsApi,
  competitorListsApi
}; 