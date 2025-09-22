/**
 * Security cleanup utility to remove sensitive data from localStorage
 * This helps prevent security violations by ensuring no auth tokens remain in localStorage
 */

export class SecurityCleanup {
  private static readonly SENSITIVE_KEYS = [
    'sb:refresh_token',
    'sb-auth-token', 
    'supabase.auth.token',
    'auth-token',
    'refresh_token',
    'access_token'
  ];

  private static readonly USER_DATA_PATTERNS = [
    /^user_\w+$/,
    /^profile_\w+$/,
    /^sb-.*$/
  ];

  private static readonly GLOBAL_DATA_KEYS = [
    'videoLists', // Old global video lists that should be user-specific
    'competitorLists', // In case this exists globally
    'currentUserId', // Old user ID storage
    'user' // Old global user data
  ];

  /**
   * Remove all sensitive authentication tokens from localStorage
   */
  static cleanAuthTokens(): void {
    if (typeof window === 'undefined') return;

    try {
      // Remove explicit sensitive keys
      this.SENSITIVE_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });

      // Remove user data that matches patterns
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Check if key matches any sensitive patterns
          const isSensitive = this.USER_DATA_PATTERNS.some(pattern => 
            pattern.test(key)
          );
          
          if (isSensitive) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      console.log('Security cleanup completed - removed sensitive tokens');
    } catch (error) {
      console.warn('Security cleanup failed:', error);
    }
  }

  /**
   * Clean up after login to prevent token leakage
   */
  static cleanAfterLogin(): void {
    // Immediate cleanup
    this.cleanAuthTokens();

    // Delayed cleanup to catch async token creation
    setTimeout(() => {
      this.cleanAuthTokens();
    }, 200);

    // Additional cleanup for persistent tokens
    setTimeout(() => {
      this.cleanAuthTokens();
    }, 1000);
  }

  /**
   * Clean up after logout to ensure complete removal
   */
  static cleanAfterLogout(): void {
    // Multiple cleanup passes
    this.cleanAuthTokens();
    
    // Also clean up global data that should be user-specific
    this.GLOBAL_DATA_KEYS.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove global data key ${key}:`, error);
      }
    });
    
    setTimeout(() => {
      this.cleanAuthTokens();
    }, 100);

    setTimeout(() => {
      this.cleanAuthTokens();
    }, 500);
  }

  /**
   * Check if localStorage contains any security violations
   * Returns list of risky keys found
   */
  static checkSecurityViolations(): string[] {
    if (typeof window === 'undefined') return [];

    const violations: string[] = [];

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          // Check explicit sensitive keys
          if (this.SENSITIVE_KEYS.includes(key)) {
            violations.push(key);
          }

          // Check patterns
          const isSensitive = this.USER_DATA_PATTERNS.some(pattern => 
            pattern.test(key)
          );
          
          if (isSensitive) {
            violations.push(key);
          }

          // Check for other common auth keys
          if (key.toLowerCase().includes('token') || 
              key.toLowerCase().includes('auth') ||
              key.toLowerCase().includes('session')) {
            violations.push(key);
          }
        }
      }
    } catch (error) {
      console.warn('Security violation check failed:', error);
    }

    return violations;
  }
}

// Export convenience functions
export const cleanAuthTokens = () => SecurityCleanup.cleanAuthTokens();
export const cleanAfterLogin = () => SecurityCleanup.cleanAfterLogin();
export const cleanAfterLogout = () => SecurityCleanup.cleanAfterLogout();
export const checkSecurityViolations = () => SecurityCleanup.checkSecurityViolations(); 