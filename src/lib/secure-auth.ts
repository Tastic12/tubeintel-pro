import { supabase } from './supabase';
import { secureStorage } from './secure-storage';
import { clearMemoryAuthStorage } from './auth-storage';
import { ensureClientSession } from './auth-session';

interface SecureUser {
  id: string;
  email?: string;
  username: string;
  hasCompletedOnboarding: boolean;
  createdAt: string;
}

interface AuthResult {
  user: SecureUser | null;
  session: any;
  error?: string;
}

class SecureAuthService {
  private static instance: SecureAuthService;
  private userCache: SecureUser | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService();
    }
    return SecureAuthService.instance;
  }

  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.user) {
        const secureUser = this.createSecureUser(data.user, false);
        this.updateCache(secureUser);
        secureStorage.setPreference('lastLoginTime', Date.now());

        if (data.session) {
          await this.setSecureCookies(data.session);
        }

        return { user: secureUser, session: data.session };
      }

      return { user: null, session: null };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Sign up failed',
      };
    }
  }

  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.user && data.session) {
        const hasCompletedOnboarding = await this.checkOnboardingStatus(data.user.id);
        const secureUser = this.createSecureUser(data.user, hasCompletedOnboarding);
        this.updateCache(secureUser);

        secureStorage.setPreference('lastLoginTime', Date.now());
        secureStorage.setSessionData('currentPage', '/dashboard');
        await this.setSecureCookies(data.session);

        return { user: secureUser, session: data.session };
      }

      return { user: null, session: null };
    } catch (error) {
      return {
        user: null,
        session: null,
        error: error instanceof Error ? error.message : 'Sign in failed',
      };
    }
  }

  async getCurrentUser(): Promise<SecureUser | null> {
    try {
      if (this.userCache && Date.now() < this.cacheExpiry) {
        return this.userCache;
      }

      const session = await ensureClientSession();
      if (!session?.user) {
        this.clearCache();
        return null;
      }

      const hasCompletedOnboarding = await this.checkOnboardingStatus(session.user.id);
      const secureUser = this.createSecureUser(session.user, hasCompletedOnboarding);
      this.updateCache(secureUser);
      return secureUser;
    } catch (error) {
      this.clearCache();
      return null;
    }
  }

  async signOut(): Promise<boolean> {
    try {
      await this.clearSecureCookies();
      const { error } = await supabase.auth.signOut();
      if (error) return false;

      this.clearCache();
      clearMemoryAuthStorage();
      secureStorage.clearAllPreferences();
      this.cleanupLegacyData();
      return true;
    } catch (error) {
      return false;
    }
  }

  async isAuthenticated(): Promise<boolean> {
    const session = await ensureClientSession();
    return Boolean(session);
  }

  async getSession() {
    return ensureClientSession();
  }

  private createSecureUser(supabaseUser: any, hasCompletedOnboarding: boolean): SecureUser {
    return {
      id: supabaseUser.id,
      email: supabaseUser.email,
      username: supabaseUser.email?.split('@')[0] || 'user',
      hasCompletedOnboarding,
      createdAt: supabaseUser.created_at || new Date().toISOString(),
    };
  }

  private async checkOnboardingStatus(userId: string): Promise<boolean> {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('youtube_channel_id, has_completed_onboarding')
        .eq('id', userId)
        .single();

      if (error || !profileData) return false;
      return !!(profileData.youtube_channel_id || profileData.has_completed_onboarding);
    } catch {
      return false;
    }
  }

  private updateCache(user: SecureUser): void {
    this.userCache = user;
    this.cacheExpiry = Date.now() + this.CACHE_DURATION;
  }

  private clearCache(): void {
    this.userCache = null;
    this.cacheExpiry = 0;
  }

  private async setSecureCookies(session: any): Promise<void> {
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

  private async clearSecureCookies(): Promise<void> {
    await fetch('/api/auth/clear-secure-session', {
      method: 'POST',
      credentials: 'include',
    });
  }

  private cleanupLegacyData(): void {
    if (typeof window === 'undefined') return;

    const legacyKeys = ['sb:refresh_token', 'currentUserId', 'youtubeChannelId', 'user', 'sb-auth-token'];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith('user_') || key.startsWith('profile_')) {
        localStorage.removeItem(key);
      }
    }

    legacyKeys.forEach((key) => localStorage.removeItem(key));

    document.cookie = 'sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

export const secureAuth = SecureAuthService.getInstance();

export const secureSignUp = (email: string, password: string) => secureAuth.signUp(email, password);
export const secureSignIn = (email: string, password: string) => secureAuth.signIn(email, password);
export const secureGetCurrentUser = () => secureAuth.getCurrentUser();
export const secureSignOut = () => secureAuth.signOut();
export const secureIsAuthenticated = () => secureAuth.isAuthenticated();
export const secureGetSession = () => secureAuth.getSession();
