import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';
import { memoryAuthStorage } from './auth-storage';
import { registerAuthSessionListener } from './auth-session';

let supabase: ReturnType<typeof createClient>;

try {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase credentials. Please check your environment variables.');
  }

  const isBrowser = typeof window !== 'undefined';

  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'sb-memory-session',
      ...(isBrowser ? { storage: memoryAuthStorage } : {}),
    },
  });

  if (isBrowser) {
    registerAuthSessionListener();
  }
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

export { supabase };

export {
  secureSignUp as signUp,
  secureSignIn as signIn,
  secureSignOut as signOut,
  secureGetCurrentUser as getCurrentUser,
  secureIsAuthenticated as isAuthenticated,
  secureGetSession as getSession,
} from './secure-auth';

export const clearUserCache = () => {
  // secureAuth handles its own cache
};
