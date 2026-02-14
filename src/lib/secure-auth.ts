/**
 * Secure Authentication Service
 * Uses httpOnly cookies for session management and removes sensitive data from localStorage
 */

import { supabase } from './supabase';
import { secureStorage } from './secure-storage';

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
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  static getInstance(): SecureAuthService {
    if (!SecureAuthService.instance) {
      SecureAuthService.instance = new SecureAuthService();
    }
    return SecureAuthService.instance;
  }

  /**
   * Secure sign up - minimizes client-side data storage
   */
  async signUp(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      // Don't store sensitive data in localStorage
      if (data.user) {
        const secureUser = this.createSecureUser(data.user, false);
        this.updateCache(secureUser);
        
        // Only store non-sensitive preferences
        secureStorage.setPreference('lastLoginTime', Date.now());
        
        return { user: secureUser, session: data.session };
      }

      return { user: null, session: null };
    } catch (error) {
      console.error('Secure sign up error:', error);
      return { 
        user: null, 
        session: null, 
        error: error instanceof Error ? error.message : 'Sign up failed' 
      };
    }
  }

  /**
   * Secure sign in - uses session cookies instead of localStorage tokens
   */
  async signIn(email: string, password: string): Promise<AuthResult> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      if (data.user && data.session) {
        // Get profile data for onboarding status
        const hasCompletedOnboarding = await this.checkOnboardingStatus(data.user.id);
        
        const secureUser = this.createSecureUser(data.user, hasCompletedOnboarding);
        this.updateCache(secureUser);

        // Store only non-sensitive preferences
        secureStorage.setPreference('lastLoginTime', Date.now());
        secureStorage.setSessionData('currentPage', '/dashboard');

        // Call API to set httpOnly cookies
        await this.setSecureCookies(data.session);

        return { user: secureUser, session: data.session };
      }

      return { user: null, session: null };
    } catch (error) {
      console.error('Secure sign in error:', error);
      return { 
        user: null, 
        session: null, 
        error: error instanceof Error ? error.message : 'Sign in failed' 
      };
    }
  }

  /**
   * Get current user securely - uses cache and server validation
   */
  async getCurrentUser(): Promise<SecureUser | null> {
    try {
      // Use cache if valid
      if (this.userCache && Date.now() < this.cacheExpiry) {
        return this.userCache;
      }

      // Get user from Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        this.clearCache();
        return null;
      }

      // Get fresh profile data only if cache expired
      const hasCompletedOnboarding = await this.checkOnboardingStatus(user.id);
      const secureUser = this.createSecureUser(user, hasCompletedOnboarding);
      
      this.updateCache(secureUser);
      return secureUser;

    } catch (error) {
      console.error('Error getting current user:', error);
      this.clearCache();
      return null;
    }
  }

  /**
   * Secure sign out - clears all client-side data
   */
  async signOut(): Promise<boolean> {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Supabase sign out error:', error);
        return false;
      }

      // Clear secure cookies via API call
      await this.clearSecureCookies();

      // Clear all client-side data
      this.clearCache();
      secureStorage.clearAllPreferences();
      this.cleanupLegacyData();

      return true;
    } catch (error) {
      console.error('Secure sign out error:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  /**
   * Get session securely
   */
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (error) {
      console.error('Get session error:', error);
      return null;
    }
  }

  // Private methods
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

      if (error || !profileData) {
        return false;
      }

      return !!(profileData.youtube_channel_id || profileData.has_completed_onboarding);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
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

  /**
   * Set secure httpOnly cookies via API
   */
  private async setSecureCookies(session: any): Promise<void> {
    try {
      await fetch('/api/auth/set-secure-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresAt: session.expires_at,
        }),
      });
    } catch (error) {
      console.error('Error setting secure cookies:', error);
      // Non-critical error - authentication still works without cookies
    }
  }

  /**
   * Clear secure httpOnly cookies via API
   */
  private async clearSecureCookies(): Promise<void> {
    try {
      await fetch('/api/auth/clear-secure-session', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error clearing secure cookies:', error);
      // Non-critical error
    }
  }

  /**
   * Clean up legacy localStorage data from old authentication system
   */
  private cleanupLegacyData(): void {
    if (typeof window === 'undefined') return;

    const legacyKeys = [
      'sb:refresh_token',
      'currentUserId',
      'youtubeChannelId',
      'user',
    ];

    // Clean up any user-specific data
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Remove user-specific keys
      if (key.startsWith('user_') || key.startsWith('profile_')) {
        localStorage.removeItem(key);
      }
    }

    // Remove legacy keys
    legacyKeys.forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

// Export singleton instance
export const secureAuth = SecureAuthService.getInstance();

// Helper functions for backward compatibility
export const secureSignUp = (email: string, password: string) => 
  secureAuth.signUp(email, password);

export const secureSignIn = (email: string, password: string) => 
  secureAuth.signIn(email, password);

export const secureGetCurrentUser = () => 
  secureAuth.getCurrentUser();

export const secureSignOut = () => 
  secureAuth.signOut();

export const secureIsAuthenticated = () => 
  secureAuth.isAuthenticated();

export const secureGetSession = () => 
  secureAuth.getSession(); 