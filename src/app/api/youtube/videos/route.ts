import { NextRequest, NextResponse } from 'next/server';
import { fetchFromYouTubeApi } from '../utils';
import { getYouTubeFetchContext } from '@/lib/request-auth';
import {
  getCachedYouTubeResponse,
  setCachedYouTubeResponse,
} from '@/lib/youtube-api-cache';

const SEARCH_CACHE_DURATION = 8 * 60 * 60 * 1000;

function routeSearchCacheKey(channelId: string, maxResults: string) {
  return `route-search:${channelId}:${maxResults}`;
}

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
      const searchCacheKey = routeSearchCacheKey(channelId, maxResults);
      const cachedSearch = await getCachedYouTubeResponse(searchCacheKey);
      let searchData: { items?: Array<{ id?: { videoId?: string } }> };

      try {
        const cacheExpired =
          !cachedSearch ||
          Date.now() - cachedSearch.timestamp > SEARCH_CACHE_DURATION;

        if (cacheExpired) {
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
            if (cachedSearch) {
              searchData = cachedSearch.data as typeof searchData;
            } else if (searchResponse.status === 429) {
              return NextResponse.json(
                { error: errBody?.error || 'Rate limit exceeded' },
                {
                  status: 429,
                  headers: searchResponse.headers,
                }
              );
            } else {
              throw new Error(errBody?.error || 'Failed to fetch video IDs');
            }
          } else {
            searchData = await searchResponse.json();
            if (!searchData?.items || !Array.isArray(searchData.items)) {
              throw new Error('Invalid search response structure from YouTube API');
            }
            await setCachedYouTubeResponse(searchCacheKey, searchData);
          }
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
