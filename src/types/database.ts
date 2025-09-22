// Database types for TubeIntel Pro

/**
 * Represents a user profile in the database
 */
export interface Profile {
  id: string;
  created_at: string;
  updated_at?: string;
  email?: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  youtube_channel_id?: string;
  has_completed_onboarding: boolean; // New column
  channel_change_cooldown?: string; // ISO timestamp of last channel change
  tour_completed: boolean; // Track tour completion status
}

/**
 * Represents a YouTube channel in the database
 */
export interface Channel {
  id: string;
  channel_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at?: string;
  subscriber_count?: number;
  view_count?: number;
  video_count?: number;
}

/**
 * Represents analytics data in the database
 */
export interface AnalyticsData {
  id: string;
  channel_id: string;
  date: string;
  views: number;
  subscribers: number;
  watch_time_minutes?: number;
  revenue_usd?: number;
  created_at: string;
}

/**
 * Represents a competitor in the database
 */
export interface Competitor {
  id: string;
  channel_id: string;
  user_id: string;
  created_at: string;
  notes?: string;
}

// Add more interfaces as needed for other tables 