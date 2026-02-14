import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

/**
 * Check if user is authenticated by verifying the auth cookie
 */
async function isAuthenticated(request: NextRequest): Promise<boolean> {
  try {
    // Get the auth token cookie
    const authCookie = request.cookies.get('sb-auth-token');
    
    if (!authCookie?.value) {
      return false;
    }

    // Parse the cookie to extract token data
    try {
      const authData = JSON.parse(authCookie.value);
      
      // Check if we have valid tokens
      if (!authData.access_token) {
        return false;
      }

      // Verify token isn't expired (if expires_at is available)
      if (authData.expires_at) {
        const expiresAt = authData.expires_at * 1000; // Convert to milliseconds
        if (Date.now() >= expiresAt) {
          // Token is expired, but we might have a refresh token
          // Let the client handle refresh - consider this temporarily authenticated
          // The actual API routes will handle token refresh
          if (authData.refresh_token) {
            return true;
          }
          return false;
        }
      }

      return true;
    } catch {
      // Cookie exists but couldn't be parsed
      return false;
    }
  } catch (error) {
    console.error('Middleware auth check error:', error);
    return false;
  }
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
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction && matchesRoute(pathname, DEBUG_ROUTES)) {
    // Return 404 for debug routes in production
    return NextResponse.rewrite(new URL('/404', request.url));
  }

  // Check authentication status
  const authenticated = await isAuthenticated(request);

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
