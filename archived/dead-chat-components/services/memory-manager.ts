/**
 * Memory Manager - Handles user identification and memory persistence
 */

export class MemoryManager {
  private static readonly USER_ID_KEY = 'mermaid_user_id';

  /**
   * Gets existing user ID or creates a new one
   * @returns User ID string
   */
  static getOrCreateUserId(): string {
    // Check if user ID exists in localStorage
    if (typeof window !== 'undefined') {
      let userId = localStorage.getItem(this.USER_ID_KEY);

      if (!userId) {
        // Create new user ID
        userId = this.generateUserId();
        localStorage.setItem(this.USER_ID_KEY, userId);
      }

      return userId;
    }

    // Fallback for server-side rendering
    return this.generateUserId();
  }

  /**
   * Generates a new unique user ID
   * @returns New user ID string
   */
  private static generateUserId(): string {
    // Generate a random UUID-like string
    return 'user_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
  }

  /**
   * Clears the stored user ID (for logout/reset)
   */
  static clearUserId(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.USER_ID_KEY);
    }
  }

  /**
   * Gets the current user ID without creating a new one
   * @returns User ID string or null if not exists
   */
  static getUserId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(this.USER_ID_KEY);
    }
    return null;
  }
}
