-- Strict Short classification: duration under 60s always counts as Short,
-- even when YouTube serves a landscape (16:9) thumbnail.

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
