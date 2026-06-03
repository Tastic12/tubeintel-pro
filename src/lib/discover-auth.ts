import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import type { User } from '@supabase/supabase-js';

export async function getDiscoverUser(request: Request): Promise<User | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const admin = createAdminClient();
  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await admin.auth.getUser(token);

  if (error || !user?.id) return null;
  return user;
}

export function unauthorizedDiscoverResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
