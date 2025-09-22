import { supabase } from '@/lib/supabase';
import { getCurrentUser } from '@/lib/supabase';

// Types
interface VideoCollectionInput {
  name: string;
  description: string;
  userId: string | 'current';
}

interface VideoCollection {
  id: string;
  name: string;
  description: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TrackedVideo {
  id: string;
  collection_id: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string | null;
  channelName: string | null;
  channelId: string | null;
  duration: string | null;
  viewCount: number | null;
  likeCount: number | null;
  publishedAt: string | null;
  created_at: string;
  updated_at: string;
}

export const videoCollectionsApi = {
  // Get all collections for the current user
  getUserCollections: async (): Promise<VideoCollection[]> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        console.log('User not authenticated in getUserCollections');
        throw new Error('User not authenticated');
      }
      
      try {
        const { data, error } = await supabase
          .from('video_collections')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
          
        if (error) {
          console.error('Error fetching video collections from Supabase:', error);
          throw error;
        }
        
        return (data || []) as unknown as VideoCollection[];
      } catch (dbError) {
        console.error('Database error in getUserCollections:', dbError);
        throw dbError;
      }
    } catch (error) {
      console.error('Error in getUserCollections:', error);
      return [];
    }
  },
  
  // Create a new video collection
  createCollection: async (collectionData: VideoCollectionInput): Promise<VideoCollection> => {
    console.log("Starting createCollection with data:", collectionData);
    
    try {
      const user = await getCurrentUser();
      console.log("getCurrentUser result:", user ? 'Authenticated' : 'Not authenticated');
      
      if (!user) {
        console.error("User not authenticated - cannot create collection");
        throw new Error('User not authenticated');
      }
      
      const userId = collectionData.userId === 'current' ? user.id : collectionData.userId;
      console.log("Using userId:", userId);
      
      try {
        console.log("Making Supabase request to create collection for user:", userId);
        
        const { data, error } = await supabase
          .from('video_collections')
          .insert([{
            name: collectionData.name,
            description: collectionData.description,
            user_id: userId,
          }])
          .select()
          .single();
          
        if (error) {
          console.error('Error creating video collection in Supabase:', error);
          throw error;
        }
        
        if (!data) {
          console.error('No data returned from Supabase after insert');
          throw new Error('Failed to create collection - no data returned');
        }
        
        console.log("Successfully created collection in Supabase:", data);
        return data as unknown as VideoCollection;
      } catch (dbError) {
        console.error('Database error creating collection:', dbError);
        throw dbError;
      }
    } catch (authError) {
      console.error('Authentication error in createCollection:', authError);
      throw new Error('Authentication error: ' + (authError instanceof Error ? authError.message : 'Unknown error'));
    }
  },
  
  // Update a video collection
  updateCollection: async (id: string, updates: Partial<VideoCollectionInput>): Promise<VideoCollection> => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { data, error } = await supabase
      .from('video_collections')
      .update({
        name: updates.name,
        description: updates.description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Security: ensure user owns this collection
      .select()
      .single();
      
    if (error) {
      console.error('Error updating video collection:', error);
      throw error;
    }
    
    return data as unknown as VideoCollection;
  },
  
  // Delete a video collection
  deleteCollection: async (id: string): Promise<void> => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const { error } = await supabase
      .from('video_collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Security: ensure user owns this collection
      
    if (error) {
      console.error('Error deleting video collection:', error);
      throw error;
    }
  },
  
  // Get all videos in a collection
  getVideosInCollection: async (collectionId: string): Promise<TrackedVideo[]> => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // First verify user owns this collection
    const { data: collectionData, error: collectionError } = await supabase
      .from('video_collections')
      .select('id')
      .eq('id', collectionId)
      .eq('user_id', user.id)
      .single();
      
    if (collectionError || !collectionData) {
      console.error('Error verifying collection ownership:', collectionError);
      throw new Error('Collection not found or access denied');
    }
    
    // Now get the videos
    const { data, error } = await supabase
      .from('tracked_videos')
      .select('*')
      .eq('collection_id', collectionId);
      
    if (error) {
      console.error('Error fetching videos in collection:', error);
      throw error;
    }
    
    // Convert database fields to camelCase for frontend
    return (data || []).map(item => ({
      id: item.id as string,
      collection_id: item.collection_id as string,
      youtubeId: item.youtube_id as string,
      title: item.title as string,
      thumbnailUrl: item.thumbnail_url as string | null,
      channelName: item.channel_name as string | null,
      channelId: item.channel_id as string | null,
      duration: item.duration as string | null,
      viewCount: item.view_count as number | null,
      likeCount: item.like_count as number | null,
      publishedAt: item.published_at as string | null,
      created_at: item.created_at as string,
      updated_at: item.updated_at as string
    }));
  },
  
  // Add a video to a collection
  addVideoToCollection: async (
    collectionId: string, 
    video: {
      youtubeId: string;
      title: string;
      thumbnailUrl?: string;
      channelName?: string;
      channelId?: string;
      duration?: string;
      viewCount?: number;
      likeCount?: number;
      publishedAt?: string;
    }
  ): Promise<TrackedVideo> => {
    try {
      console.log('Starting addVideoToCollection with:', { collectionId, video });
      
      const user = await getCurrentUser();
      if (!user) {
        console.error('User not authenticated');
        throw new Error('User not authenticated');
      }
      
      // First verify user owns this collection
      const { data: collectionData, error: collectionError } = await supabase
        .from('video_collections')
        .select('id')
        .eq('id', collectionId)
        .eq('user_id', user.id)
        .single();
        
      if (collectionError) {
        console.error('Error verifying collection ownership:', collectionError);
        throw new Error(`Collection not found or access denied: ${collectionError.message}`);
      }
      
      if (!collectionData) {
        console.error('Collection not found');
        throw new Error('Collection not found');
      }
      
      // Validate required data
      if (!video.youtubeId) {
        console.error('Missing YouTube ID');
        throw new Error('YouTube ID is required');
      }
      
      if (!video.title) {
        console.error('Missing video title');
        throw new Error('Video title is required');
      }
      
      // Check if video already exists in this collection
      const { data: existingVideo, error: checkError } = await supabase
        .from('tracked_videos')
        .select('id')
        .eq('collection_id', collectionId)
        .eq('youtube_id', video.youtubeId)
        .single();
        
      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking for existing video:', checkError);
        throw new Error(`Failed to check for existing video: ${checkError.message}`);
      }
      
      if (existingVideo) {
        console.error('Video already exists in collection');
        throw new Error('This video is already in your collection');
      }
      
      // Prepare data for insertion
      const dataToInsert = {
        collection_id: collectionId,
        youtube_id: video.youtubeId,
        title: video.title,
        thumbnail_url: video.thumbnailUrl || null,
        channel_name: video.channelName || null,
        channel_id: video.channelId || null,
        duration: video.duration || null,
        view_count: typeof video.viewCount === 'number' ? video.viewCount : null,
        like_count: typeof video.likeCount === 'number' ? video.likeCount : null,
        published_at: video.publishedAt || null
      };
      
      console.log('Inserting video data into Supabase:', dataToInsert);
      
      // Add the video
      const { data, error } = await supabase
        .from('tracked_videos')
        .insert([dataToInsert])
        .select()
        .single();
        
      if (error) {
        console.error('Error adding video to collection:', error);
        throw new Error(`Failed to add video: ${error.message}`);
      }
      
      if (!data) {
        console.error('No data returned after insert');
        throw new Error('Failed to add video: No data returned');
      }
      
      console.log('Video added successfully:', data);
      
      // Convert database fields to camelCase for frontend
      return {
        id: data.id as string,
        collection_id: data.collection_id as string,
        youtubeId: data.youtube_id as string,
        title: data.title as string,
        thumbnailUrl: data.thumbnail_url as string | null,
        channelName: data.channel_name as string | null,
        channelId: data.channel_id as string | null,
        duration: data.duration as string | null,
        viewCount: data.view_count as number | null,
        likeCount: data.like_count as number | null,
        publishedAt: data.published_at as string | null,
        created_at: data.created_at as string,
        updated_at: data.updated_at as string
      };
    } catch (error) {
      console.error('Error in addVideoToCollection:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to add video: Unknown error');
    }
  },
  
  // Remove a video from a collection
  removeVideoFromCollection: async (videoId: string): Promise<void> => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Delete the video
    const { error } = await supabase
      .from('tracked_videos')
      .delete()
      .eq('id', videoId);
      
    if (error) {
      console.error('Error removing video from collection:', error);
      throw error;
    }
  }
}; 