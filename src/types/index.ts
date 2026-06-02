// User types
export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

// Profile types
export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
  youtube_channel_id: string | null;
}

// Authentication types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// YouTube Channel types
export interface Channel {
  id: string;
  youtubeId: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

// YouTube Video types
export interface Video {
  id: string;
  youtubeId: string;
  channelId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: Date;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  vph: number; // Views Per Hour
  performanceScore?: number;
  /** ISO 8601 duration from YouTube — used for SQL outlier scoring only */
  durationIso?: string | null;
  /** SQL-computed views/median ratio — consumed by calculateOutlierScore */
  outlierScore?: number | null;
  /** Channel median views used for SQL score — tooltip fallback */
  outlierMedianViews?: number | null;
}

// Alert types
export interface Alert {
  id: string;
  videoId: string;
  type: 'vph' | 'comment' | 'like';
  threshold: number;
  message: string;
  createdAt: Date;
  read: boolean;
}

// Competitor types
export interface Competitor {
  id: string;
  youtubeId: string;
  name: string;
  thumbnailUrl: string;
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
}

// Transcript types
export interface Transcript {
  id: string;
  videoId: string;
  content: string;
  createdAt: Date;
}

// Metadata types
export interface VideoMetadata {
  id: string;
  videoId: string;
  tags: string[];
  category: string;
  language: string;
  madeForKids: boolean;
  privacyStatus: 'public' | 'private' | 'unlisted';
  dimension: '2d' | '3d';
  definition: 'hd' | 'sd';
  caption: boolean;
  licensedContent: boolean;
  contentRating: Record<string, any>;
}

// AI Insight types
export interface Insight {
  id: string;
  videoId: string;
  channelId: string;
  type: 'viral' | 'engagement' | 'content';
  summary: string;
  details: Record<string, any>;
  createdAt: Date;
} 