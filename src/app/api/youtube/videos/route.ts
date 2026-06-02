import { NextRequest, NextResponse } from 'next/server';
import { fetchFromYouTubeApi } from '../utils';
import { getYouTubeFetchContext } from '@/lib/request-auth';

const searchCache = new Map<string, { data: unknown; timestamp: number }>();
const SEARCH_CACHE_DURATION = 8 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const channelId = searchParams.get('channelId');
    const maxResults = searchParams.get('maxResults') || '10';
    const part = searchParams.get('part') || 'snippet,statistics,contentDetails';

    if (id) {
      const ctx = await getYouTubeFetchContext('competitors-refresh');
      return fetchFromYouTubeApi('videos', { part, id }, ctx);
    }

    if (channelId) {
      const ctx = await getYouTubeFetchContext('sync-videos');
      const searchCacheKey = `search:${channelId}:${maxResults}`;
      const cachedSearch = searchCache.get(searchCacheKey);
      let searchData: { items?: Array<{ id?: { videoId?: string } }> };

      try {
        if (!cachedSearch || Date.now() - cachedSearch.timestamp > SEARCH_CACHE_DURATION) {
          const searchResponse = await fetchFromYouTubeApi(
            'search',
            {
              part: 'snippet',
              channelId,
              maxResults,
              order: 'date',
              type: 'video',
            },
            ctx
          );

          if (!searchResponse.ok) {
            const errBody = await searchResponse.json().catch(() => ({}));
            if (searchResponse.status === 429) {
              return NextResponse.json(
                { error: errBody?.error || 'Rate limit exceeded' },
                {
                  status: 429,
                  headers: searchResponse.headers,
                }
              );
            }
            throw new Error(errBody?.error || 'Failed to fetch video IDs');
          }

          searchData = await searchResponse.json();
          if (!searchData?.items || !Array.isArray(searchData.items)) {
            throw new Error('Invalid search response structure from YouTube API');
          }

          searchCache.set(searchCacheKey, {
            data: searchData,
            timestamp: Date.now(),
          });
        } else {
          searchData = cachedSearch.data as typeof searchData;
        }
      } catch (error) {
        if (cachedSearch) {
          searchData = cachedSearch.data as typeof searchData;
        } else {
          console.error('YouTube search failed with no cached data:', error);
          return NextResponse.json(
            { error: 'YouTube API quota exceeded and no cached data available' },
            { status: 503 }
          );
        }
      }

      const videoIds = searchData?.items
        ?.map((item) => item.id?.videoId)
        .filter(Boolean)
        .join(',');

      if (!videoIds) {
        return NextResponse.json({ items: [] });
      }

      return fetchFromYouTubeApi(
        'videos',
        { part: 'snippet,statistics,contentDetails', id: videoIds },
        ctx
      );
    }

    const ctx = await getYouTubeFetchContext('competitors-refresh');
    return fetchFromYouTubeApi(
      'videos',
      { part, chart: 'mostPopular', regionCode: 'US', maxResults },
      ctx
    );
  } catch (error) {
    console.error('Error in videos route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the request' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
