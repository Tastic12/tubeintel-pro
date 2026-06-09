import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';
import {
  applyAuthCookies,
  clearAuthCookies,
  readAuthTokensFromCookies,
} from '@/lib/auth-cookies';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const admin = createAdminClient();
    let { accessToken, refreshToken } = readAuthTokensFromCookies();

    if (!accessToken && !refreshToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let sessionResponse = accessToken
      ? await admin.auth.getUser(accessToken)
      : { data: { user: null }, error: { message: 'missing access token' } };

    if ((sessionResponse.error || !sessionResponse.data.user) && refreshToken) {
      const refreshed = await admin.auth.refreshSession({ refresh_token: refreshToken });
      if (refreshed.error || !refreshed.data.session) {
        const response = NextResponse.json({ authenticated: false }, { status: 401 });
        clearAuthCookies(response);
        return response;
      }

      const response = NextResponse.json({
        authenticated: true,
        user: {
          id: refreshed.data.session.user.id,
          email: refreshed.data.session.user.email,
        },
        access_token: refreshed.data.session.access_token,
        refresh_token: refreshed.data.session.refresh_token,
        expires_at: refreshed.data.session.expires_at,
      });

      applyAuthCookies(response, {
        accessToken: refreshed.data.session.access_token,
        refreshToken: refreshed.data.session.refresh_token,
        expiresAt: refreshed.data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      });

      return response;
    }

    if (sessionResponse.error || !sessionResponse.data.user || !accessToken || !refreshToken) {
      const response = NextResponse.json({ authenticated: false }, { status: 401 });
      clearAuthCookies(response);
      return response;
    }

    const user = sessionResponse.data.user;

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load session';
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
