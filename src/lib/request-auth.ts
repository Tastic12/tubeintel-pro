import { cookies, headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import { readAuthTokensFromCookies } from '@/lib/auth-cookies';
import { checkRateLimit, type LimiterId, type RateLimitResult } from '@/lib/rate-limit';
import type { YouTubeFetchContext } from '@/lib/youtube-fetch-context';

export type RequestUser = {
  id: string;
  email: string;
};

function getAccessTokenFromRequest(): string | null {
  const { accessToken } = readAuthTokensFromCookies();
  if (accessToken) return accessToken;

  const authHeader = headers().get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim() || null;
  }

  return null;
}

export async function getRequestUser(): Promise<RequestUser | null> {
  const accessToken = getAccessTokenFromRequest();
  if (!accessToken) return null;

  try {
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(accessToken);
    if (error || !user?.id || !user.email) return null;
    return { id: user.id, email: user.email };
  } catch {
    return null;
  }
}

function getClientIp(): string {
  const headerStore = headers();
  const forwarded = headerStore.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return headerStore.get('x-real-ip') || 'unknown';
}

export async function getRateLimitKey(): Promise<string> {
  const user = await getRequestUser();
  if (user) return user.id;
  return `anon:${getClientIp()}`;
}

export function rateLimitToResponse(result: Extract<RateLimitResult, { ok: false }>) {
  return NextResponse.json(
    { error: result.message },
    {
      status: result.status,
      headers: { 'Retry-After': String(result.retryAfterSeconds) },
    }
  );
}

export async function getYouTubeFetchContext(
  limiterId: LimiterId
): Promise<YouTubeFetchContext> {
  const user = await getRequestUser();
  const rateLimitKey = await getRateLimitKey();
  return {
    userId: user?.id,
    rateLimitKey,
    limiterId,
  };
}
