import { Channel, Video, VideoMetadata } from '@/types';

export interface IYouTubeService {
  // Channel methods
  getChannelById(channelId: string): Promise<Channel>;
  searchChannels(query: string): Promise<Channel[]>;
  getChannelIdByUsername(username: string): Promise<string>;
  
  // Video methods
  getVideoById(videoId: string): Promise<Video>;
  getVideosByIds(videoIds: string[]): Promise<Video[]>;
  getVideosByChannelId(channelId: string, maxResults?: number): Promise<Video[]>;
  getTopVideos(maxResults?: number): Promise<Video[]>;
  searchVideos(query: string, maxResults?: number): Promise<Video[]>;
  
  // Metadata methods
  getVideoMetadata(videoId: string): Promise<VideoMetadata>;
  
  // Utility methods
  testApiKey(): Promise<boolean>;
}

// Example of how a RapidAPI implementation would look
export interface IRapidAPIYouTubeService extends IYouTubeService {
  // Additional RapidAPI specific methods could go here
  getChannelByUsername(username: string): Promise<Channel>;
  getChannelByCustomUrl(customUrl: string): Promise<Channel>;
} 