import { createAdminClient } from '@/utils/supabase/server';
import type { User } from '@supabase/supabase-js';

export async function getThumbnailUser(request: Request): Promise<User | null> {
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
