/**
 * User-specific localStorage utility
 * Ensures data is stored per user to prevent cross-user data sharing
 */

import { getCurrentUser } from '@/lib/supabase';

export class UserStorage {
  private static async getUserId(): Promise<string | null> {
    try {
      const user = await getCurrentUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  private static getUserKey(key: string, userId: string): string {
    return `user_${userId}_${key}`;
  }

  /**
   * Get user-specific data from localStorage
   */
  static async getUserData<T>(key: string): Promise<T | null> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('No user ID found, cannot retrieve user-specific data');
        return null;
      }

      const userKey = this.getUserKey(key, userId);
      const data = localStorage.getItem(userKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Set user-specific data in localStorage
   */
  static async setUserData<T>(key: string, data: T): Promise<boolean> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('No user ID found, cannot store user-specific data');
        return false;
      }

      const userKey = this.getUserKey(key, userId);
      localStorage.setItem(userKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Error setting user data:', error);
      return false;
    }
  }

  /**
   * Remove user-specific data from localStorage
   */
  static async removeUserData(key: string): Promise<boolean> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('No user ID found, cannot remove user-specific data');
        return false;
      }

      const userKey = this.getUserKey(key, userId);
      localStorage.removeItem(userKey);
      return true;
    } catch (error) {
      console.error('Error removing user data:', error);
      return false;
    }
  }

  /**
   * Clear all data for the current user
   */
  static async clearUserData(): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('No user ID found, cannot clear user-specific data');
        return;
      }

      const userPrefix = `user_${userId}_`;
      const keysToRemove: string[] = [];

      // Find all keys that belong to this user
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(userPrefix)) {
          keysToRemove.push(key);
        }
      }

      // Remove all user-specific keys
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing user data:', error);
    }
  }

  /**
   * Migrate existing global data to user-specific storage
   * This helps transition from global localStorage to user-specific storage
   */
  static async migrateGlobalData(globalKey: string, userKey: string): Promise<void> {
    try {
      const userId = await this.getUserId();
      if (!userId) {
        console.warn('No user ID found, cannot migrate data');
        return;
      }

      // Check if user-specific data already exists
      const userSpecificKey = this.getUserKey(userKey, userId);
      const existingUserData = localStorage.getItem(userSpecificKey);
      
      if (existingUserData) {
        // User already has data, don't overwrite
        return;
      }

      // Get global data
      const globalData = localStorage.getItem(globalKey);
      if (globalData) {
        // Move global data to user-specific storage
        localStorage.setItem(userSpecificKey, globalData);
        console.log(`Migrated ${globalKey} to user-specific storage for user ${userId.substring(0, 8)}...`);
      }
    } catch (error) {
      console.error('Error migrating global data:', error);
    }
  }
} 