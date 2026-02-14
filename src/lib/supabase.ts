import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

/**
 * Supabase Client
 * 
 * This file only exports the Supabase client instance.
 * For authentication, use secureAuth from '@/lib/secure-auth'.
 * 
 * @example
 * // For database operations:
 * import { supabase } from '@/lib/supabase';
 * const { data } = await supabase.from('profiles').select('*');
 * 
 * // For authentication:
 * import { secureAuth } from '@/lib/secure-auth';
 * await secureAuth.signIn(email, password);
 */

let supabase: ReturnType<typeof createClient>;

try {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase credentials. Please check your environment variables.');
  }
  
  const isBrowser = typeof window !== 'undefined';
  
  // Create the client with secure cookie-based session storage
  supabase = createClient(
    SUPABASE_URL, 
    SUPABASE_ANON_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        ...(isBrowser ? {
          storageKey: 'sb-auth-token',
          storage: {
            getItem: (key) => {
              const value = document.cookie
                .split('; ')
                .find((row) => row.startsWith(`${key}=`))
                ?.split('=')[1];
              return value ? decodeURIComponent(value) : null;
            },
            setItem: (key, value) => {
              // Set cookie with HttpOnly flag via server-side API for security
              // Client-side cookie is used for Supabase SDK compatibility
              // The actual secure tokens are stored in httpOnly cookies via /api/auth/set-secure-session
              document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax; Secure`;
            },
            removeItem: (key) => {
              document.cookie = `${key}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
              // Clean up any legacy localStorage tokens
              try {
                localStorage.removeItem(key);
                localStorage.removeItem('sb:refresh_token');
                localStorage.removeItem('sb-auth-token');
              } catch {
                // Ignore localStorage errors
              }
            }
          }
        } : {})
      }
    }
  );
  
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

export { supabase };

/**
 * @deprecated Use secureAuth from '@/lib/secure-auth' instead.
 * These functions are kept temporarily for backward compatibility.
 * They will be removed in the next major version.
 */

// Re-export secure auth functions for backward compatibility
// This allows gradual migration of existing code
export { 
  secureSignUp as signUp,
  secureSignIn as signIn,
  secureSignOut as signOut,
  secureGetCurrentUser as getCurrentUser,
  secureIsAuthenticated as isAuthenticated,
  secureGetSession as getSession,
} from './secure-auth';

// Clear user cache - now handled by secureAuth internally
export const clearUserCache = () => {
  // No-op - secureAuth handles its own cache
}; 