-- Global thumbnail embed queue for server-side cron (no per-user session required).

CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings_global(
    batch_size INTEGER DEFAULT 25
)
RETURNS TABLE (
    youtube_video_id TEXT,
    thumbnail_url    TEXT
)
LANGUAGE sql
STABLE
AS $$
    WITH all_thumbs AS (
        SELECT tv.youtube_id AS yt_id, tv.thumbnail_url AS thumb_url, 1 AS pri
          FROM public.tracked_videos tv
         WHERE tv.thumbnail_url IS NOT NULL
        UNION ALL
        SELECT c.youtube_video_id AS yt_id,
               public.youtube_default_thumb_url(c.youtube_video_id) AS thumb_url,
               2 AS pri
          FROM public.video_outlier_cache c
        UNION ALL
        SELECT dv.video_id AS yt_id, dv.thumbnail_url AS thumb_url, 3 AS pri
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
    ),
    deduped AS (
        SELECT DISTINCT ON (at.yt_id) at.yt_id, at.thumb_url, at.pri
          FROM all_thumbs at
         ORDER BY at.yt_id, at.pri
    )
    SELECT d.yt_id AS youtube_video_id, d.thumb_url AS thumbnail_url
      FROM deduped d
      LEFT JOIN public.thumbnail_embeddings te ON te.youtube_video_id = d.yt_id
     WHERE te.id IS NULL
     ORDER BY d.pri, d.yt_id
     LIMIT batch_size;
$$;

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings_global(INTEGER)
    TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings_global_count()
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
      FROM (
        SELECT tv.youtube_id AS yt_id
          FROM public.tracked_videos tv
         WHERE tv.thumbnail_url IS NOT NULL
        UNION
        SELECT c.youtube_video_id AS yt_id
          FROM public.video_outlier_cache c
        UNION
        SELECT dv.video_id AS yt_id
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
      ) all_thumbs
      LEFT JOIN public.thumbnail_embeddings te ON te.youtube_video_id = all_thumbs.yt_id
     WHERE te.id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings_global_count()
    TO authenticated, service_role;
