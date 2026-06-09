import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { readAccessTokenFromCookieReader } from '@/lib/auth-cookies';

// Routes that require authentication
const PROTECTED_ROUTES = [
  '/dashboard',
  '/onboarding',
  '/subscription',
];

// Routes that should redirect to dashboard if already authenticated
const AUTH_ROUTES = [
  '/login',
  '/signup',
];

// Debug API routes blocked in production
const DEBUG_API_ROUTES = [
  '/api/debug-subscription',
  '/api/set-pro-subscription',
];

// Debug/test routes that should be blocked in production
const DEBUG_ROUTES = [
  '/api-analytics',
  '/api-key-test',
  '/check-subscription',
  '/security-audit',
  '/subscription-debug',
  '/supabase-test',
  '/test-optimizations',
  '/test-supabase',
  '/test-supabase-competitors',
];

// Public routes that don't need any auth checks
const PUBLIC_ROUTES = [
  '/',
  '/faq',
  '/api',
];

/** Requires the HttpOnly sb-access-token cookie — not session-active or legacy cookies. */
function isAuthenticated(request: NextRequest): boolean {
  return Boolean(readAccessTokenFromCookieReader(request.cookies));
}

/**
 * Check if route matches any patterns
 */
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route.endsWith('*')) {
      return pathname.startsWith(route.slice(0, -1));
    }
    return pathname === route || pathname.startsWith(route + '/');
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction && DEBUG_API_ROUTES.includes(pathname)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Skip middleware for static files and API routes (except protected ones)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/images') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/stripe/webhook')
  ) {
    return NextResponse.next();
  }

  // Block debug routes in production
  if (isProduction && matchesRoute(pathname, DEBUG_ROUTES)) {
    // Return 404 for debug routes in production
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // Check authentication status
  const authenticated = isAuthenticated(request);

  // Handle protected routes
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!authenticated) {
      // Store the intended destination for redirect after login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Handle auth routes (redirect to dashboard if already logged in)
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (authenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
