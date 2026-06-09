import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import {
  cosineSimilarity,
  embedImageFromUrl,
  embedText,
  embeddingToPgvectorText,
} from '@/lib/embeddings';
import { pickThumbnailFromYoutube } from '@/lib/thumbnail-meta';
import { requireThumbnailProUser } from '@/lib/thumbnail-auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logYoutubeApiUsage, getServiceAdmin } from '@/lib/admin';
import { classifyAsShort } from '@/lib/classify-short';

export const maxDuration = 60;

type YouTubeSearchItem = {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelId: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: Record<string, { url?: string; width?: number; height?: number }>;
  };
};

type ExpandResult = {
  youtube_video_id: string;
  thumbnail_url: string;
  similarity: number;
  title: string;
  view_count: null;
  published_at: string | null;
  outlier_score: null;
  is_short: boolean | null;
  source: 'youtube_expand';
  channel_id: string;
  channel_name: string;
};

export async function POST(request: Request) {
  try {
    const auth = await requireThumbnailProUser(request);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const rl = await checkRateLimit(user.id, 'thumbnail-expand');
    if (!rl.ok) {
      return NextResponse.json(
        { error: rl.message },
        { status: rl.status, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      );
    }

    const youtubeApiKey = process.env.YOUTUBE_API_KEY;
    if (!youtubeApiKey) {
      return NextResponse.json({ error: 'YouTube API key is not configured' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const nicheQuery = (body?.niche_query as string | undefined)?.trim();
    const styleQuery = (body?.style_query as string | undefined)?.trim();
    const referenceVideoId = (body?.reference_video_id as string | undefined)?.trim();
    const maxResults = Math.min(Math.max(Number(body?.max_results) || 25, 5), 50);

    if (!nicheQuery) {
      return NextResponse.json({ error: 'niche_query is required' }, { status: 400 });
    }

    const admin = createAdminClient();
    let queryVec: number[];

    if (referenceVideoId) {
      const { data: source } = await admin
        .from('thumbnail_embeddings')
        .select('embedding')
        .eq('youtube_video_id', referenceVideoId)
        .maybeSingle();

      if (source?.embedding) {
        if (typeof source.embedding === 'string') {
          const parsed = JSON.parse(
            source.embedding.startsWith('[') ? source.embedding : `[${source.embedding}]`
          ) as number[];
          queryVec = parsed;
        } else if (Array.isArray(source.embedding)) {
          queryVec = source.embedding as number[];
        } else {
          return NextResponse.json({ error: 'Invalid stored embedding.' }, { status: 500 });
        }
      } else {
        const thumbUrl = `https://i.ytimg.com/vi/${referenceVideoId}/hqdefault.jpg`;
        queryVec = await embedImageFromUrl(thumbUrl);
      }
    } else if (styleQuery) {
      queryVec = await embedText(styleQuery);
    } else {
      return NextResponse.json(
        { error: 'Provide style_query (text) or reference_video_id (visual reference).' },
        { status: 400 }
      );
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      q: nicheQuery,
      maxResults: String(maxResults),
      order: 'relevance',
      key: youtubeApiKey,
    });

    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`
    );
    const searchJson = (await searchRes.json()) as {
      items?: YouTubeSearchItem[];
      error?: { message?: string };
    };

    if (!searchRes.ok) {
      return NextResponse.json(
        { error: searchJson.error?.message || 'YouTube search failed' },
        { status: 502 }
      );
    }

    try {
      const usageAdmin = getServiceAdmin();
      await logYoutubeApiUsage(usageAdmin, {
        userId: user.id,
        endpoint: 'search',
        units: 100,
      });
    } catch {
      // optional
    }

    const items = searchJson.items ?? [];
    const results: ExpandResult[] = [];

    for (const item of items) {
      const videoId = item.id?.videoId;
      if (!videoId) continue;

      const picked = pickThumbnailFromYoutube(item.snippet.thumbnails);
      const thumbUrl = picked.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      try {
        let vec: number[] | null = null;
        const { data: existing } = await admin
          .from('thumbnail_embeddings')
          .select('embedding')
          .eq('youtube_video_id', videoId)
          .maybeSingle();

        if (existing?.embedding) {
          if (typeof existing.embedding === 'string') {
            vec = JSON.parse(
              existing.embedding.startsWith('[') ? existing.embedding : `[${existing.embedding}]`
            ) as number[];
          } else if (Array.isArray(existing.embedding)) {
            vec = existing.embedding as number[];
          }
        }

        if (!vec) {
          vec = await embedImageFromUrl(thumbUrl);
          await admin.from('thumbnail_embeddings').upsert(
            {
              youtube_video_id: videoId,
              thumbnail_url: thumbUrl,
              embedding: embeddingToPgvectorText(vec),
            },
            { onConflict: 'youtube_video_id' }
          );
        }

        const similarity = cosineSimilarity(queryVec, vec);
        results.push({
          youtube_video_id: videoId,
          thumbnail_url: thumbUrl,
          similarity,
          title: item.snippet.title,
          view_count: null,
          published_at: item.snippet.publishedAt || null,
          outlier_score: null,
          is_short: classifyAsShort({
            thumbnailWidth: picked.width,
            thumbnailHeight: picked.height,
          }),
          source: 'youtube_expand',
          channel_id: item.snippet.channelId,
          channel_name: item.snippet.channelTitle,
        });
      } catch (err) {
        console.warn('expand embed skip', videoId, err);
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);

    return NextResponse.json({
      success: true,
      niche_query: nicheQuery,
      results,
      message: `Found ${results.length} videos on YouTube for "${nicheQuery}" ranked by thumbnail similarity.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
