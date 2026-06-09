import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import type { User } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/request-auth';
import { proFeatureForbiddenResponse, userHasProAccess } from '@/lib/subscription-server';

export async function getDiscoverUser(_request?: Request): Promise<User | null> {
  const requestUser = await getRequestUser();
  if (!requestUser) return null;

  const admin = createAdminClient();
  const {
    data: { user },
    error,
  } = await admin.auth.admin.getUserById(requestUser.id);

  if (error || !user?.id) return null;
  return user;
}

export function unauthorizedDiscoverResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export type DiscoverAuthResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function requireDiscoverProUser(request: Request): Promise<DiscoverAuthResult> {
  const user = await getDiscoverUser(request);
  if (!user) {
    return { ok: false, response: unauthorizedDiscoverResponse() };
  }

  if (!(await userHasProAccess(user.id))) {
    return { ok: false, response: proFeatureForbiddenResponse() };
  }

  return { ok: true, user };
}
