import { NextRequest } from 'next/server';
import { fetchFromYouTubeApi } from '../utils';
import { enforceYouTubeRateLimit } from '@/lib/request-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { blocked, user } = await enforceYouTubeRateLimit('competitors-init');
  if (blocked) return blocked;

  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const channelId = searchParams.get('channelId');
    const type = searchParams.get('type') || 'video';
    const maxResults = searchParams.get('maxResults') || '10';
    const part = searchParams.get('part') || 'snippet';
    const order = searchParams.get('order') || 'relevance';

    const params: Record<string, string> = {
      part,
      maxResults,
      type,
      order,
    };

    if (query) params.q = query;
    if (channelId) params.channelId = channelId;

    return fetchFromYouTubeApi('search', params, { userId: user?.id });
  } catch (error) {
    console.error('Error in search route:', error);
    return Response.json(
      { error: 'An error occurred while processing the request' },
      { status: 500 }
    );
  }
}
