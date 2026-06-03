-- Portrait thumbnail + duration Short classification (from original ClikStats).

CREATE OR REPLACE FUNCTION public.classify_as_short(
    duration_iso TEXT,
    thumb_w      INTEGER,
    thumb_h      INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    ratio NUMERIC;
BEGIN
    IF thumb_w IS NOT NULL AND thumb_h IS NOT NULL AND thumb_w > 0 AND thumb_h > 0 THEN
        ratio := thumb_h::NUMERIC / thumb_w::NUMERIC;
        IF ratio > 1.15 THEN
            RETURN TRUE;
        END IF;
        IF ratio <= 1.05 THEN
            RETURN FALSE;
        END IF;
    END IF;

    RETURN public.is_short_duration(duration_iso);
END;
$$;

GRANT EXECUTE ON FUNCTION public.classify_as_short(TEXT, INTEGER, INTEGER)
    TO authenticated, service_role;

-- Discover: recompute is_short from thumbnail aspect ratio + duration.
ALTER TABLE public.discovered_videos DROP COLUMN IF EXISTS is_short;

ALTER TABLE public.discovered_videos
    ADD COLUMN is_short BOOLEAN
        GENERATED ALWAYS AS (
            public.classify_as_short(duration, thumbnail_width, thumbnail_height)
        ) STORED;
