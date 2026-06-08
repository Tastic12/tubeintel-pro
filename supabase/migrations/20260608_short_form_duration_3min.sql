-- Short-form ceiling: 3 minutes (YouTube Shorts max). Catches clips posted as regular
-- uploads (e.g. 1:06, 1:20, 2:07) that are still short-form content.

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

    RETURN total_seconds > 0 AND total_seconds <= 180;
END;
$$;

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
    IF public.is_short_duration(duration_iso) THEN
        RETURN TRUE;
    END IF;

    IF thumb_w IS NOT NULL AND thumb_h IS NOT NULL AND thumb_w > 0 AND thumb_h > 0 THEN
        ratio := thumb_h::NUMERIC / thumb_w::NUMERIC;
        IF ratio > 1.15 THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;
