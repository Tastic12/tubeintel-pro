import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getRequestUser, type RequestUser } from '@/lib/request-auth';

export type AuthenticatedResult =
  | { ok: true; user: RequestUser }
  | { ok: false; response: NextResponse };

export async function requireAuthenticatedUser(): Promise<AuthenticatedResult> {
  const user = await getRequestUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  return { ok: true, user };
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function notFoundResponse() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

const DEBUG_API_ROUTES = new Set([
  '/api/debug-subscription',
  '/api/set-pro-subscription',
]);

export function isBlockedDebugApi(pathname: string): boolean {
  return DEBUG_API_ROUTES.has(pathname);
}

export function blockDebugApiInProduction(pathname: string): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') return null;
  if (!isBlockedDebugApi(pathname)) return null;
  return notFoundResponse();
}

export async function assertCompetitorListOwnership(
  admin: SupabaseClient,
  userId: string,
  listId: string
): Promise<boolean> {
  const { data } = await admin
    .from('competitor_lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data?.id);
}

export async function assertVideoCollectionOwnership(
  admin: SupabaseClient,
  userId: string,
  collectionId: string
): Promise<boolean> {
  const { data } = await admin
    .from('video_collections')
    .select('id')
    .eq('id', collectionId)
    .eq('user_id', userId)
    .maybeSingle();

  return Boolean(data?.id);
}
