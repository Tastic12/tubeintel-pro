-- Create a table for video collections (similar to competitor_lists)
CREATE TABLE IF NOT EXISTS public.video_collections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create a table for tracked videos (similar to tracked_competitors)
CREATE TABLE IF NOT EXISTS public.tracked_videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    collection_id UUID REFERENCES public.video_collections(id) ON DELETE CASCADE,
    youtube_id TEXT NOT NULL,
    title TEXT NOT NULL,
    thumbnail_url TEXT,
    channel_name TEXT,
    channel_id TEXT,
    duration TEXT,
    view_count INTEGER,
    like_count INTEGER,
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(collection_id, youtube_id)
);

-- Enable Row Level Security on both tables
ALTER TABLE public.video_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_videos ENABLE ROW LEVEL SECURITY;

-- Create policies for video collections
CREATE POLICY "Users can view their own video collections" 
ON public.video_collections
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own video collections" 
ON public.video_collections
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own video collections" 
ON public.video_collections
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own video collections" 
ON public.video_collections
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for tracked videos
CREATE POLICY "Users can view videos in their collections" 
ON public.tracked_videos
FOR SELECT 
USING (
    collection_id IN (
        SELECT id FROM public.video_collections 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can add videos to their collections" 
ON public.tracked_videos
FOR INSERT 
WITH CHECK (
    collection_id IN (
        SELECT id FROM public.video_collections 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update videos in their collections" 
ON public.tracked_videos
FOR UPDATE 
USING (
    collection_id IN (
        SELECT id FROM public.video_collections 
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete videos from their collections" 
ON public.tracked_videos
FOR DELETE 
USING (
    collection_id IN (
        SELECT id FROM public.video_collections 
        WHERE user_id = auth.uid()
    )
); 