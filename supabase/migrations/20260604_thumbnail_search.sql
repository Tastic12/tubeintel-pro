-- Thumbnail similarity search (CLIP + pgvector) — adapted for ClikStats V2 schema.
-- Corpus: tracked_videos, video_outlier_cache, discovered_videos.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.thumbnail_embeddings (
    id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    youtube_video_id TEXT UNIQUE NOT NULL,
    thumbnail_url    TEXT NOT NULL,
    embedding        vector(512) NOT NULL,
    created_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at       TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_thumbnail_embeddings_vec
    ON public.thumbnail_embeddings USING hnsw (embedding vector_cosine_ops);

ALTER TABLE public.thumbnail_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read thumbnail embeddings"
    ON public.thumbnail_embeddings;
CREATE POLICY "Authenticated users can read thumbnail embeddings"
    ON public.thumbnail_embeddings FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.youtube_default_thumb_url(p_video_id TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT 'https://i.ytimg.com/vi/' || p_video_id || '/hqdefault.jpg';
$$;

-- Global KNN search with V2 metadata joins.
CREATE OR REPLACE FUNCTION public.search_thumbnails(
    user_uuid       UUID,
    query_embedding TEXT,
    match_count     INTEGER DEFAULT 20
)
RETURNS TABLE (
    youtube_video_id TEXT,
    thumbnail_url    TEXT,
    similarity       FLOAT,
    title            TEXT,
    view_count       BIGINT,
    published_at     TIMESTAMPTZ,
    outlier_score    NUMERIC,
    is_short         BOOLEAN,
    source           TEXT,
    channel_id       TEXT,
    channel_name     TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    qvec vector(512);
BEGIN
    qvec := query_embedding::vector(512);

    RETURN QUERY
    WITH nearest AS (
        SELECT
            te.youtube_video_id AS yt_id,
            te.thumbnail_url    AS thumb_url,
            (1 - (te.embedding <=> qvec))::FLOAT AS sim
        FROM public.thumbnail_embeddings te
        ORDER BY te.embedding <=> qvec
        LIMIT match_count
    ),
    collection_meta AS (
        SELECT DISTINCT ON (tv.youtube_id)
            tv.youtube_id      AS yt_id,
            tv.title           AS t,
            tv.view_count::BIGINT AS vc,
            tv.published_at    AS pa,
            NULL::NUMERIC      AS os,
            public.classify_as_short(tv.duration, NULL, NULL) AS sh,
            'collection'::TEXT AS src,
            tv.channel_id      AS cid,
            tv.channel_name    AS cname
        FROM public.tracked_videos tv
        JOIN public.video_collections vc ON vc.id = tv.collection_id
        WHERE vc.user_id = user_uuid
          AND tv.youtube_id IN (SELECT n.yt_id FROM nearest n)
        ORDER BY tv.youtube_id, tv.updated_at DESC
    ),
    own_meta AS (
        SELECT DISTINCT ON (c.youtube_video_id)
            c.youtube_video_id AS yt_id,
            NULL::TEXT         AS t,
            c.view_count::BIGINT AS vc,
            c.published_at     AS pa,
            c.outlier_score    AS os,
            c.is_short         AS sh,
            'own'::TEXT        AS src,
            c.youtube_channel_id AS cid,
            COALESCE(p.username, 'Your channel') AS cname
        FROM public.video_outlier_cache c
        LEFT JOIN public.profiles p ON p.id = c.user_id
        WHERE c.user_id = user_uuid
          AND c.source = 'own'
          AND c.youtube_video_id IN (SELECT n.yt_id FROM nearest n)
        ORDER BY c.youtube_video_id, c.updated_at DESC
    ),
    competitor_meta AS (
        SELECT DISTINCT ON (c.youtube_video_id)
            c.youtube_video_id AS yt_id,
            NULL::TEXT         AS t,
            c.view_count::BIGINT AS vc,
            c.published_at     AS pa,
            c.outlier_score    AS os,
            c.is_short         AS sh,
            'competitor'::TEXT AS src,
            c.youtube_channel_id AS cid,
            COALESCE(tc.name, 'Competitor') AS cname
        FROM public.video_outlier_cache c
        LEFT JOIN public.tracked_competitors tc
            ON tc.youtube_id = c.youtube_channel_id
        LEFT JOIN public.competitor_lists cl ON cl.id = tc.list_id AND cl.user_id = user_uuid
        WHERE c.user_id = user_uuid
          AND c.source = 'competitor'
          AND c.youtube_video_id IN (SELECT n.yt_id FROM nearest n)
        ORDER BY c.youtube_video_id, c.updated_at DESC
    ),
    discovered_meta AS (
        SELECT DISTINCT ON (dv.video_id)
            dv.video_id        AS yt_id,
            dv.title           AS t,
            dv.view_count      AS vc,
            dv.published_at    AS pa,
            NULL::NUMERIC      AS os,
            dv.is_short        AS sh,
            'discovered'::TEXT AS src,
            dv.channel_id      AS cid,
            dv.channel_name    AS cname
        FROM public.discovered_videos dv
        WHERE dv.video_id IN (SELECT n.yt_id FROM nearest n)
        ORDER BY dv.video_id, dv.last_seen_at DESC
    )
    SELECT
        n.yt_id,
        n.thumb_url,
        n.sim,
        COALESCE(cm.t, om.t, comp.t, dm.t) AS title,
        COALESCE(cm.vc, om.vc, comp.vc, dm.vc) AS view_count,
        COALESCE(cm.pa, om.pa, comp.pa, dm.pa) AS published_at,
        COALESCE(cm.os, om.os, comp.os, dm.os) AS outlier_score,
        COALESCE(cm.sh, om.sh, comp.sh, dm.sh) AS is_short,
        COALESCE(cm.src, om.src, comp.src, dm.src, 'unknown'::TEXT) AS source,
        COALESCE(cm.cid, om.cid, comp.cid, dm.cid) AS channel_id,
        COALESCE(cm.cname, om.cname, comp.cname, dm.cname) AS channel_name
    FROM nearest n
    LEFT JOIN collection_meta cm ON cm.yt_id = n.yt_id
    LEFT JOIN own_meta om        ON om.yt_id = n.yt_id
    LEFT JOIN competitor_meta comp ON comp.yt_id = n.yt_id
    LEFT JOIN discovered_meta dm ON dm.yt_id = n.yt_id
    ORDER BY n.sim DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_thumbnails(UUID, TEXT, INTEGER)
    TO authenticated, service_role;

-- Embed queue: collections → competitor cache → discover → own cache
CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings(
    user_uuid UUID,
    batch_size INTEGER DEFAULT 25
)
RETURNS TABLE (
    youtube_video_id TEXT,
    thumbnail_url    TEXT
)
LANGUAGE sql
STABLE
AS $$
    WITH user_thumbs AS (
        SELECT tv.youtube_id AS yt_id, tv.thumbnail_url AS thumb_url, 1 AS pri
          FROM public.tracked_videos tv
          JOIN public.video_collections vc ON vc.id = tv.collection_id
         WHERE vc.user_id = user_uuid AND tv.thumbnail_url IS NOT NULL
        UNION ALL
        SELECT c.youtube_video_id AS yt_id,
               public.youtube_default_thumb_url(c.youtube_video_id) AS thumb_url,
               2 AS pri
          FROM public.video_outlier_cache c
         WHERE c.user_id = user_uuid AND c.source = 'competitor'
        UNION ALL
        SELECT dv.video_id AS yt_id, dv.thumbnail_url AS thumb_url, 3 AS pri
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
        UNION ALL
        SELECT c.youtube_video_id AS yt_id,
               public.youtube_default_thumb_url(c.youtube_video_id) AS thumb_url,
               4 AS pri
          FROM public.video_outlier_cache c
         WHERE c.user_id = user_uuid AND c.source = 'own'
    ),
    deduped AS (
        SELECT DISTINCT ON (ut.yt_id) ut.yt_id, ut.thumb_url, ut.pri
          FROM user_thumbs ut
         ORDER BY ut.yt_id, ut.pri
    )
    SELECT d.yt_id AS youtube_video_id, d.thumb_url AS thumbnail_url
      FROM deduped d
      LEFT JOIN public.thumbnail_embeddings te ON te.youtube_video_id = d.yt_id
     WHERE te.id IS NULL
     ORDER BY d.pri, d.yt_id
     LIMIT batch_size;
$$;

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings(UUID, INTEGER)
    TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.pending_thumbnail_embeddings_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(*)::INTEGER
      FROM (
        SELECT tv.youtube_id AS yt_id
          FROM public.tracked_videos tv
          JOIN public.video_collections vc ON vc.id = tv.collection_id
         WHERE vc.user_id = user_uuid AND tv.thumbnail_url IS NOT NULL
        UNION
        SELECT c.youtube_video_id AS yt_id
          FROM public.video_outlier_cache c
         WHERE c.user_id = user_uuid
        UNION
        SELECT dv.video_id AS yt_id
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
      ) all_thumbs
      LEFT JOIN public.thumbnail_embeddings te ON te.youtube_video_id = all_thumbs.yt_id
     WHERE te.id IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.pending_thumbnail_embeddings_count(UUID)
    TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.thumbnail_index_stats(user_uuid UUID)
RETURNS TABLE (
    source   TEXT,
    total    BIGINT,
    indexed  BIGINT,
    pending  BIGINT
)
LANGUAGE sql
STABLE
AS $$
    WITH collection_thumbs AS (
        SELECT tv.youtube_id AS yt_id
          FROM public.tracked_videos tv
          JOIN public.video_collections vc ON vc.id = tv.collection_id
         WHERE vc.user_id = user_uuid AND tv.thumbnail_url IS NOT NULL
    ),
    competitor_thumbs AS (
        SELECT c.youtube_video_id AS yt_id
          FROM public.video_outlier_cache c
         WHERE c.user_id = user_uuid AND c.source = 'competitor'
    ),
    own_thumbs AS (
        SELECT c.youtube_video_id AS yt_id
          FROM public.video_outlier_cache c
         WHERE c.user_id = user_uuid AND c.source = 'own'
    ),
    discovered_thumbs AS (
        SELECT dv.video_id AS yt_id
          FROM public.discovered_videos dv
         WHERE dv.thumbnail_url IS NOT NULL
           AND dv.last_seen_at >= timezone('utc'::text, now()) - INTERVAL '14 days'
    ),
    buckets AS (
        SELECT 'collection'::TEXT AS src, yt_id FROM collection_thumbs
        UNION ALL
        SELECT 'competitor'::TEXT, yt_id FROM competitor_thumbs
        UNION ALL
        SELECT 'discovered'::TEXT, yt_id FROM discovered_thumbs
        UNION ALL
        SELECT 'own'::TEXT, yt_id FROM own_thumbs
    ),
    deduped AS (
        SELECT DISTINCT src, yt_id FROM buckets
    )
    SELECT
        d.src AS source,
        COUNT(*)::BIGINT AS total,
        COUNT(te.id)::BIGINT AS indexed,
        (COUNT(*) - COUNT(te.id))::BIGINT AS pending
    FROM deduped d
    LEFT JOIN public.thumbnail_embeddings te ON te.youtube_video_id = d.yt_id
    GROUP BY d.src
    ORDER BY CASE d.src
        WHEN 'competitor' THEN 1
        WHEN 'discovered' THEN 2
        WHEN 'collection' THEN 3
        ELSE 4
    END;
$$;

GRANT EXECUTE ON FUNCTION public.thumbnail_index_stats(UUID)
    TO authenticated, service_role;
