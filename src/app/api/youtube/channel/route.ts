import { NextResponse } from 'next/server';
import { fetchFromYouTubeApi } from '../utils';
import { getYouTubeFetchContext } from '@/lib/request-auth';

function extractUsername(url: string): string {
  let cleanUrl = url.replace(/^(https?:\/\/)?(www\.)?/, '');
  cleanUrl = cleanUrl.replace(/\/+$/, '');

  if (cleanUrl.includes('youtube.com/c/')) {
    return cleanUrl.split('youtube.com/c/')[1];
  }
  if (cleanUrl.includes('youtube.com/channel/')) {
    return cleanUrl.split('youtube.com/channel/')[1];
  }
  if (cleanUrl.includes('youtube.com/user/')) {
    return cleanUrl.split('youtube.com/user/')[1];
  }
  if (cleanUrl.includes('youtube.com/@')) {
    return cleanUrl.split('youtube.com/@')[1];
  }
  return cleanUrl;
}

export async function GET(request: Request) {
  try {
    const ctx = await getYouTubeFetchContext('competitors-init');
    const { searchParams } = new URL(request.url);
    const customUrl = searchParams.get('url');

    if (!customUrl) {
      return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });
    }

    const cleanUrl = extractUsername(customUrl);
    const searchQueries = [
      cleanUrl,
      `@${cleanUrl}`,
      `${cleanUrl} channel`,
      `${cleanUrl} youtube`,
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
        const data = await searchResponse.json();

        if (data.items?.length > 0) {
          const channelId = data.items[0].id.channelId;
          return NextResponse.json({ channelId });
        }
      } catch (error) {
        console.error(`Error with search query "${query}":`, error);
      }
    }

    return NextResponse.json({ error: 'Channel not found' }, { status: 404 });
  } catch (error: unknown) {
    console.error('Error resolving channel:', error);
    const message = error instanceof Error ? error.message : 'Failed to resolve channel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
