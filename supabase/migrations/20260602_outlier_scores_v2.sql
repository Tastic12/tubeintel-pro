-- ClikStats V2: SQL outlier scoring cache (adapted from original ClikStats)
-- Works with live YouTube API data synced via /api/outliers/sync
-- Does NOT require a permanent videos table.

-- ----------------------------------------------------------------------------
-- Duration helpers
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_short_duration(duration_iso TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    total_seconds INTEGER := 0;
    minutes_part  INTEGER;
    seconds_part  INTEGER;
    hours_part    INTEGER;
BEGIN
    IF duration_iso IS NULL OR duration_iso = '' THEN
        RETURN FALSE;
    END IF;

    hours_part := NULLIF(substring(duration_iso FROM 'PT(\d+)H'), '')::INTEGER;
    IF hours_part IS NOT NULL AND hours_part > 0 THEN
        RETURN FALSE;
    END IF;

    minutes_part := COALESCE(NULLIF(substring(duration_iso FROM '(\d+)M'), '')::INTEGER, 0);
    seconds_part := COALESCE(NULLIF(substring(duration_iso FROM '(\d+)S'), '')::INTEGER, 0);
    total_seconds := minutes_part * 60 + seconds_part;

    RETURN total_seconds > 0 AND total_seconds < 60;
END;
$$;

-- ----------------------------------------------------------------------------
-- Cache table: latest video metrics per user for outlier computation
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.video_outlier_cache (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    youtube_video_id    TEXT NOT NULL,
    youtube_channel_id  TEXT NOT NULL,
    view_count          INTEGER NOT NULL DEFAULT 0,
    published_at        TIMESTAMPTZ,
    duration_iso        TEXT,
    is_short            BOOLEAN NOT NULL DEFAULT FALSE,
    source              TEXT NOT NULL DEFAULT 'own'
                            CHECK (source IN ('own', 'competitor')),
    outlier_score       NUMERIC(10, 2),
    outlier_velocity_score NUMERIC(10, 2),
    niche_outlier_score NUMERIC(10, 2),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE (user_id, youtube_video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_outlier_cache_user_channel
    ON public.video_outlier_cache (user_id, youtube_channel_id);

CREATE INDEX IF NOT EXISTS idx_video_outlier_cache_user_score
    ON public.video_outlier_cache (user_id, outlier_score DESC NULLS LAST);

ALTER TABLE public.video_outlier_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own outlier cache"
    ON public.video_outlier_cache FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own outlier cache"
    ON public.video_outlier_cache FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own outlier cache"
    ON public.video_outlier_cache FOR UPDATE
    USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Baseline: median views of recent uploads (shorts vs long-form separate)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.v2_channel_baseline_views(
    p_user_id            UUID,
    p_youtube_channel_id TEXT,
    p_want_short         BOOLEAN,
    p_window_size        INTEGER DEFAULT 30,
    p_min_sample         INTEGER DEFAULT 5
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    baseline     NUMERIC;
    sample_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO sample_count
      FROM (
        SELECT 1
          FROM public.video_outlier_cache
         WHERE user_id = p_user_id
           AND youtube_channel_id = p_youtube_channel_id
           AND is_short = p_want_short
         ORDER BY published_at DESC NULLS LAST
         LIMIT p_window_size
      ) s;

    IF sample_count < p_min_sample THEN
        RETURN NULL;
    END IF;

    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count)
      INTO baseline
      FROM (
        SELECT view_count
          FROM public.video_outlier_cache
         WHERE user_id = p_user_id
           AND youtube_channel_id = p_youtube_channel_id
           AND is_short = p_want_short
         ORDER BY published_at DESC NULLS LAST
         LIMIT p_window_size
      ) recent;

    RETURN GREATEST(baseline, 100);
END;
$$;

-- Niche baseline: median across all tracked competitor videos for this user
CREATE OR REPLACE FUNCTION public.v2_niche_baseline_views(
    p_user_id    UUID,
    p_want_short BOOLEAN
)
RETURNS NUMERIC
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    baseline     NUMERIC;
    sample_count INTEGER;
BEGIN
    SELECT COUNT(*)
      INTO sample_count
      FROM public.video_outlier_cache
     WHERE user_id = p_user_id
       AND source = 'competitor'
       AND is_short = p_want_short
       AND view_count IS NOT NULL;

    IF sample_count < 5 THEN
        RETURN NULL;
    END IF;

    SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY view_count)
      INTO baseline
      FROM public.video_outlier_cache
     WHERE user_id = p_user_id
       AND source = 'competitor'
       AND is_short = p_want_short
       AND view_count IS NOT NULL;

    RETURN GREATEST(baseline, 100);
END;
$$;

-- Recompute channel-level outlier + velocity scores
CREATE OR REPLACE FUNCTION public.recompute_outlier_scores_v2(
    p_user_id            UUID,
    p_youtube_channel_id TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    long_baseline  NUMERIC;
    short_baseline NUMERIC;
    rows_updated   INTEGER;
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    long_baseline  := public.v2_channel_baseline_views(p_user_id, p_youtube_channel_id, FALSE);
    short_baseline := public.v2_channel_baseline_views(p_user_id, p_youtube_channel_id, TRUE);

    UPDATE public.video_outlier_cache v
       SET outlier_score = CASE
            WHEN v.is_short THEN
                CASE WHEN short_baseline IS NULL OR short_baseline = 0 THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / short_baseline, 2)
                END
            ELSE
                CASE WHEN long_baseline IS NULL OR long_baseline = 0 THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / long_baseline, 2)
                END
        END,
        outlier_velocity_score = CASE
            WHEN v.published_at IS NULL THEN NULL
            WHEN v.is_short THEN
                CASE WHEN short_baseline IS NULL OR short_baseline = 0 THEN NULL
                     ELSE ROUND(
                        (v.view_count::NUMERIC / GREATEST(
                            EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v.published_at)) / 86400.0,
                            1.0
                        )) / GREATEST(short_baseline / 30.0, 1.0),
                        2
                     )
                END
            ELSE
                CASE WHEN long_baseline IS NULL OR long_baseline = 0 THEN NULL
                     ELSE ROUND(
                        (v.view_count::NUMERIC / GREATEST(
                            EXTRACT(EPOCH FROM (timezone('utc'::text, now()) - v.published_at)) / 86400.0,
                            1.0
                        )) / GREATEST(long_baseline / 30.0, 1.0),
                        2
                     )
                END
        END,
        updated_at = timezone('utc'::text, now())
     WHERE v.user_id = p_user_id
       AND v.youtube_channel_id = p_youtube_channel_id;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

-- Recompute niche scores (vs tracked competitors) for all of a user's cached videos
CREATE OR REPLACE FUNCTION public.recompute_niche_outlier_scores_v2(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    long_baseline  NUMERIC;
    short_baseline NUMERIC;
    rows_updated   INTEGER;
BEGIN
    IF auth.uid() IS NOT NULL AND auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Forbidden';
    END IF;

    long_baseline  := public.v2_niche_baseline_views(p_user_id, FALSE);
    short_baseline := public.v2_niche_baseline_views(p_user_id, TRUE);

    UPDATE public.video_outlier_cache v
       SET niche_outlier_score = CASE
            WHEN v.is_short THEN
                CASE WHEN short_baseline IS NULL THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / short_baseline, 2)
                END
            ELSE
                CASE WHEN long_baseline IS NULL THEN NULL
                     ELSE ROUND(v.view_count::NUMERIC / long_baseline, 2)
                END
        END,
        updated_at = timezone('utc'::text, now())
     WHERE v.user_id = p_user_id;

    GET DIAGNOSTICS rows_updated = ROW_COUNT;
    RETURN rows_updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recompute_outlier_scores_v2(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recompute_niche_outlier_scores_v2(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_channel_baseline_views(UUID, TEXT, BOOLEAN, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.v2_niche_baseline_views(UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_short_duration(TEXT) TO authenticated, service_role;
