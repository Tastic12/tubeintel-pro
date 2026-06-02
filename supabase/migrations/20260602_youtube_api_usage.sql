-- YouTube API usage log for admin quota dashboard
-- Run in Supabase SQL Editor if not already applied.

CREATE TABLE IF NOT EXISTS public.youtube_api_usage (
    id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    endpoint   TEXT NOT NULL,
    units      INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_youtube_api_usage_created
    ON public.youtube_api_usage (created_at DESC);

ALTER TABLE public.youtube_api_usage ENABLE ROW LEVEL SECURITY;

-- No public policies; admin routes use service role.

CREATE OR REPLACE FUNCTION public.youtube_api_usage_summary(since_ts TIMESTAMPTZ DEFAULT NULL)
RETURNS TABLE (
    total_units BIGINT,
    call_count  BIGINT,
    by_endpoint JSONB
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH filtered AS (
        SELECT *
          FROM public.youtube_api_usage
         WHERE since_ts IS NULL OR created_at >= since_ts
    ),
    by_ep AS (
        SELECT endpoint, SUM(units)::BIGINT AS endpoint_units
          FROM filtered
         GROUP BY endpoint
    )
    SELECT
        (SELECT COALESCE(SUM(units), 0) FROM filtered)::BIGINT AS total_units,
        (SELECT COUNT(*) FROM filtered)::BIGINT AS call_count,
        (SELECT COALESCE(jsonb_object_agg(endpoint, endpoint_units), '{}'::jsonb) FROM by_ep) AS by_endpoint;
$$;

GRANT EXECUTE ON FUNCTION public.youtube_api_usage_summary(TIMESTAMPTZ) TO service_role;
