import { NextRequest, NextResponse } from 'next/server';
import { fetchFromYouTubeApi, guardYouTubeProxyRequest } from '../utils';
import { getYouTubeFetchContext } from '@/lib/request-auth';

export async function GET(request: NextRequest) {
  try {
    const blocked = await guardYouTubeProxyRequest();
    if (blocked) return blocked;

    const ctx = await getYouTubeFetchContext('competitors-init');
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const username = searchParams.get('username');
    const forUsername = searchParams.get('forUsername');
    const part = searchParams.get('part') || 'snippet,statistics';

    if (id) {
      return fetchFromYouTubeApi('channels', { part, id }, ctx);
    }

    if (forUsername || username) {
      const rawUsername = forUsername || username || '';
      const cleanUsername = rawUsername.startsWith('@')
        ? rawUsername.substring(1)
        : rawUsername;

      if (cleanUsername) {
        const handleResponse = await fetchFromYouTubeApi(
          'channels',
          { part, forHandle: cleanUsername },
          ctx
        );
        const handleData = await handleResponse.json();
        if (handleData.items?.length > 0) {
          return NextResponse.json(handleData);
        }
      }

      const searchQueries = [
        cleanUsername,
        `@${cleanUsername}`,
        `${cleanUsername} channel`,
        `${cleanUsername} youtube`,
      ];

      for (const query of searchQueries) {
        try {
          const searchResponse = await fetchFromYouTubeApi(
            'search',
            {
              q: query,
              type: 'channel',
              part: 'snippet',
              maxResults: '5',
            },
            ctx
          );
          const searchData = await searchResponse.json();

          if (searchData.items?.length > 0) {
            const channelIds = searchData.items
              .map((item: { id: { channelId: string } }) => item.id.channelId)
              .join(',');

            const channelResponse = await fetchFromYouTubeApi(
              'channels',
              { part, id: channelIds },
              ctx
            );
            const channelData = await channelResponse.json();

            if (channelData.items?.length > 0) {
              return NextResponse.json(channelData);
            }
          }
        } catch (error) {
          console.error(`Error with search query "${query}":`, error);
        }
      }

      return NextResponse.json({ items: [] });
    }

    return NextResponse.json(
      { error: 'Missing channel identifier. Please provide id or username parameter.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in channels route:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the request' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
