-- Extra fields on saved videos so search filters work on the Videos tab
ALTER TABLE public.tracked_videos
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS comment_count INTEGER,
  ADD COLUMN IF NOT EXISTS channel_subscriber_count BIGINT,
  ADD COLUMN IF NOT EXISTS channel_video_count INTEGER,
  ADD COLUMN IF NOT EXISTS channel_view_count BIGINT,
  ADD COLUMN IF NOT EXISTS channel_published_at TIMESTAMPTZ;

COMMENT ON COLUMN public.tracked_videos.description IS 'Video description snapshot for keyword filters';
COMMENT ON COLUMN public.tracked_videos.comment_count IS 'Comment count snapshot for engagement filters';
COMMENT ON COLUMN public.tracked_videos.channel_subscriber_count IS 'Channel subscriber count snapshot when video was saved';
COMMENT ON COLUMN public.tracked_videos.channel_published_at IS 'YouTube channel creation date for channel age filters';
