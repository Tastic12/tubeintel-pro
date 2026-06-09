import { NextRequest, NextResponse } from 'next/server';
import { fetchFromYouTubeApi, guardYouTubeProxyRequest } from '../utils';
import { getYouTubeFetchContext } from '@/lib/request-auth';
import { requireAuthenticatedUser } from '@/lib/api-security';
import {
  isYoutubeChannelId,
  tryParseChannelIdLocally,
  tryParseHandleLocally,
} from '@/lib/youtube-channel-input';

export const dynamic = 'force-dynamic';

function legacySlugFromInput(input: string): string | null {
  const trimmed = input.trim();
  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'c' && parts[1]) return parts[1];
    if (parts[0] === 'user' && parts[1]) return parts[1];
  } catch {
    // Not a URL.
  }

  return null;
}

async function resolveByHandle(handle: string, ctx: Awaited<ReturnType<typeof getYouTubeFetchContext>>) {
  const clean = handle.startsWith('@') ? handle.slice(1) : handle;
  if (!clean) return null;

  const response = await fetchFromYouTubeApi(
    'channels',
    { part: 'id', forHandle: clean },
    ctx
  );
  const data = await response.json();
  const id = data?.items?.[0]?.id;
  return typeof id === 'string' && isYoutubeChannelId(id) ? id : null;
}

async function resolveBySearchSlug(
  slug: string,
  ctx: Awaited<ReturnType<typeof getYouTubeFetchContext>>
) {
  const queries = [slug, `@${slug}`, `${slug} channel`];

  for (const q of queries) {
    const searchResponse = await fetchFromYouTubeApi(
      'search',
      { q, type: 'channel', part: 'snippet', maxResults: '5' },
      ctx
    );
    const searchData = await searchResponse.json();
    const channelId = searchData?.items?.[0]?.id?.channelId;
    if (typeof channelId === 'string' && isYoutubeChannelId(channelId)) {
      return channelId;
    }
  }

  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuthenticatedUser();
    if (!auth.ok) return auth.response;

    const input = request.nextUrl.searchParams.get('input')?.trim();
    if (!input) {
      return NextResponse.json({ error: 'Missing input parameter' }, { status: 400 });
    }

    const localId = tryParseChannelIdLocally(input);
    if (localId) {
      return NextResponse.json({ channelId: localId });
    }

    const blocked = await guardYouTubeProxyRequest();
    if (blocked) return blocked;

    const ctx = await getYouTubeFetchContext('competitors-init');

    const handle = tryParseHandleLocally(input);
    if (handle) {
      const byHandle = await resolveByHandle(handle, ctx);
      if (byHandle) {
        return NextResponse.json({ channelId: byHandle });
      }
    }

    const legacySlug = legacySlugFromInput(input);
    if (legacySlug) {
      const bySlug = await resolveBySearchSlug(legacySlug, ctx);
      if (bySlug) {
        return NextResponse.json({ channelId: bySlug });
      }
    }

    return NextResponse.json(
      { error: 'Channel not found. Try the full youtube.com/@handle or channel URL.' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error resolving channel:', error);
    return NextResponse.json(
      { error: 'Failed to resolve channel' },
      { status: 500 }
    );
  }
}
