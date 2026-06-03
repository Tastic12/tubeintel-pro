-- Discover tab: trending YouTube videos by region + category (global corpus).

CREATE TABLE IF NOT EXISTS public.user_discover_settings (
    user_id       UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    region_code   TEXT NOT NULL DEFAULT 'GB',
    category_ids  INTEGER[] NOT NULL DEFAULT ARRAY[20, 24, 25, 28, 17],
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_discover_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own discover settings" ON public.user_discover_settings;
CREATE POLICY "Users manage own discover settings"
    ON public.user_discover_settings FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.discovered_videos (
    id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    video_id          TEXT NOT NULL,
    title             TEXT NOT NULL,
    thumbnail_url     TEXT NOT NULL,
    thumbnail_width   INTEGER,
    thumbnail_height  INTEGER,
    channel_id        TEXT,
    channel_name      TEXT,
    category_id       INTEGER NOT NULL,
    region_code       TEXT NOT NULL,
    published_at      TIMESTAMP WITH TIME ZONE,
    duration          TEXT,
    view_count        BIGINT DEFAULT 0,
    like_count        BIGINT DEFAULT 0,
    is_short          BOOLEAN GENERATED ALWAYS AS (public.is_short_duration(duration)) STORED,
    discovered_at     TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_seen_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (video_id, region_code, category_id)
);

CREATE INDEX IF NOT EXISTS idx_discovered_videos_region_category
    ON public.discovered_videos (region_code, category_id, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_discovered_videos_video_id
    ON public.discovered_videos (video_id);

ALTER TABLE public.discovered_videos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read discovered videos"
    ON public.discovered_videos;
CREATE POLICY "Authenticated users can read discovered videos"
    ON public.discovered_videos FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.discovered_videos TO authenticated;
GRANT ALL ON public.user_discover_settings TO authenticated;
