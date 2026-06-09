/**
 * In-memory session storage for the browser Supabase client.
 * Tokens are not written to document.cookie or localStorage.
 */
const memoryStore = new Map<string, string>();

export const memoryAuthStorage = {
  getItem(key: string): string | null {
    return memoryStore.get(key) ?? null;
  },
  setItem(key: string, value: string): void {
    memoryStore.set(key, value);
  },
  removeItem(key: string): void {
    memoryStore.delete(key);
  },
};

export function clearMemoryAuthStorage(): void {
  memoryStore.clear();
}
