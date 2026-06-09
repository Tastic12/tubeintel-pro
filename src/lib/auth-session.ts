'use client';

import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearMemoryAuthStorage } from '@/lib/auth-storage';

let bootstrapPromise: Promise<Session | null> | null = null;
let listenerRegistered = false;

async function syncSecureCookies(session: Session): Promise<void> {
  await fetch('/api/auth/set-secure-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: session.expires_at,
    }),
  });
}

/**
 * Ensures the in-memory Supabase session exists and HttpOnly auth cookies are synced
 * before server-side routes (e.g. /api/subscription/status) read the user.
 */
export async function ensureAuthReady(): Promise<Session | null> {
  const session = await ensureClientSession();
  if (session) {
    await syncSecureCookies(session);
  }
  return session;
}

export function registerAuthSessionListener(): void {
  if (listenerRegistered || typeof window === 'undefined') return;
  listenerRegistered = true;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      await syncSecureCookies(session);
    }

    if (event === 'SIGNED_OUT') {
      await fetch('/api/auth/clear-secure-session', {
        method: 'POST',
        credentials: 'include',
      });
      clearMemoryAuthStorage();
    }
  });
}

export async function ensureClientSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) return session;

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'include',
        cache: 'no-store',
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.access_token || !data.refresh_token) return null;

      const { data: setData, error } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (error || !setData.session) return null;
      return setData.session;
    })().finally(() => {
      bootstrapPromise = null;
    });
  }

  return bootstrapPromise;
}

export async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await ensureAuthReady();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return { Authorization: `Bearer ${session.access_token}` };
}
