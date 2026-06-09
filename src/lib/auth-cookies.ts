import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export const ACCESS_TOKEN_COOKIE = 'sb-access-token';
export const REFRESH_TOKEN_COOKIE = 'sb-refresh-token';
export const SESSION_ACTIVE_COOKIE = 'session-active';
export const LEGACY_AUTH_COOKIE = 'sb-auth-token';

export type AuthTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

type CookieReader = {
  get: (name: string) => { value: string } | undefined;
};

/** Strict gate: only the HttpOnly access token counts as authenticated. */
export function readAccessTokenFromCookieReader(reader: CookieReader): string | null {
  const token = reader.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  return token || null;
}

export function readAuthTokensFromCookies(): AuthTokens {
  const cookieStore = cookies();

  let accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  let refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  if (!accessToken) {
    const legacy = cookieStore.get(LEGACY_AUTH_COOKIE)?.value;
    if (legacy) {
      try {
        const authData = JSON.parse(legacy);
        accessToken = authData.access_token ?? null;
        refreshToken = refreshToken ?? authData.refresh_token ?? null;
      } catch {
        // Ignore malformed legacy cookie.
      }
    }
  }

  return { accessToken, refreshToken };
}

export function hasAuthCookie(): boolean {
  const cookieStore = cookies();
  if (cookieStore.get(ACCESS_TOKEN_COOKIE)?.value) return true;
  if (cookieStore.get(SESSION_ACTIVE_COOKIE)?.value === 'true') return true;

  const legacy = cookieStore.get(LEGACY_AUTH_COOKIE)?.value;
  if (!legacy) return false;

  try {
    const authData = JSON.parse(legacy);
    return Boolean(authData.access_token);
  } catch {
    return false;
  }
}

export function applyAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string; expiresAt: number }
) {
  const expiresDate = new Date(tokens.expiresAt * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const secure = process.env.NODE_ENV === 'production';

  response.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    expires: expiresDate,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    expires: refreshExpiresDate,
  });

  response.cookies.set(SESSION_ACTIVE_COOKIE, 'true', {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    expires: expiresDate,
  });

  clearLegacyAuthCookie(response);
}

export function clearAuthCookies(response: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
  const expired = new Date(0);

  response.cookies.set(ACCESS_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    expires: expired,
  });

  response.cookies.set(REFRESH_TOKEN_COOKIE, '', {
    httpOnly: true,
    secure,
    sameSite: 'strict',
    path: '/',
    expires: expired,
  });

  response.cookies.set(SESSION_ACTIVE_COOKIE, '', {
    httpOnly: false,
    secure,
    sameSite: 'strict',
    path: '/',
    expires: expired,
  });

  clearLegacyAuthCookie(response);
}

export function clearLegacyAuthCookie(response: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
  response.cookies.set(LEGACY_AUTH_COOKIE, '', {
    httpOnly: false,
    secure,
    sameSite: 'lax',
    path: '/',
    expires: new Date(0),
  });
}
