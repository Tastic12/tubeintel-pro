-- Persist competitor channel videos so we only call YouTube for new uploads.

ALTER TABLE public.tracked_competitors
  ADD COLUMN IF NOT EXISTS uploads_playlist_id TEXT,
  ADD COLUMN IF NOT EXISTS videos_synced_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.tracked_competitor_videos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES public.competitor_lists(id) ON DELETE CASCADE,
    tracked_competitor_id UUID NOT NULL REFERENCES public.tracked_competitors(id) ON DELETE CASCADE,
    youtube_video_id TEXT NOT NULL,
    youtube_channel_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    thumbnail_width INTEGER,
    thumbnail_height INTEGER,
    published_at TIMESTAMPTZ NOT NULL,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    duration_iso TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tracked_competitor_id, youtube_video_id)
);

CREATE INDEX IF NOT EXISTS idx_tracked_competitor_videos_list
    ON public.tracked_competitor_videos (list_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_tracked_competitor_videos_competitor
    ON public.tracked_competitor_videos (tracked_competitor_id);

ALTER TABLE public.tracked_competitor_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view competitor videos in their lists"
ON public.tracked_competitor_videos
FOR SELECT
USING (
    list_id IN (
        SELECT id FROM public.competitor_lists WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert competitor videos in their lists"
ON public.tracked_competitor_videos
FOR INSERT
WITH CHECK (
    list_id IN (
        SELECT id FROM public.competitor_lists WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update competitor videos in their lists"
ON public.tracked_competitor_videos
FOR UPDATE
USING (
    list_id IN (
        SELECT id FROM public.competitor_lists WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete competitor videos in their lists"
ON public.tracked_competitor_videos
FOR DELETE
USING (
    list_id IN (
        SELECT id FROM public.competitor_lists WHERE user_id = auth.uid()
    )
);
