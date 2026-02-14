'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseDebouncedSearchOptions {
  /** Delay in milliseconds before triggering the search (default: 500ms) */
  delay?: number;
  /** Minimum query length before triggering search (default: 3) */
  minLength?: number;
  /** Whether to show loading state during debounce delay (default: false) */
  showLoadingDuringDelay?: boolean;
}

interface UseDebouncedSearchReturn<T> {
  /** Current search query */
  query: string;
  /** Set the search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: T[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Clear the search results and query */
  clear: () => void;
  /** Manually trigger a search */
  search: (query: string) => Promise<void>;
}

/**
 * Custom hook for debounced search with request cancellation support.
 * 
 * Features:
 * - Configurable debounce delay (default 500ms)
 * - Minimum query length check
 * - Automatic request cancellation when query changes
 * - Loading and error state management
 * 
 * @param searchFn - Async function that performs the search
 * @param options - Configuration options
 * @returns Search state and controls
 * 
 * @example
 * ```tsx
 * const { query, setQuery, results, isLoading, error } = useDebouncedSearch(
 *   async (q) => {
 *     const res = await fetch(`/api/search?q=${q}`);
 *     return res.json();
 *   },
 *   { delay: 300, minLength: 2 }
 * );
 * ```
 */
export function useDebouncedSearch<T>(
  searchFn: (query: string, signal?: AbortSignal) => Promise<T[]>,
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn<T> {
  const {
    delay = 500,
    minLength = 3,
    showLoadingDuringDelay = false,
  } = options;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref to track the current abort controller
  const abortControllerRef = useRef<AbortController | null>(null);
  // Ref to track the current debounce timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Perform the actual search with cancellation support
   */
  const performSearch = useCallback(async (searchQuery: string) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Don't search if query is too short
    if (searchQuery.length < minLength) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchFn(searchQuery, abortController.signal);
      
      // Only update results if this request wasn't cancelled
      if (!abortController.signal.aborted) {
        setResults(searchResults);
        setIsLoading(false);
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      // Only update error if this request wasn't cancelled
      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
        setIsLoading(false);
      }
    }
  }, [searchFn, minLength]);

  /**
   * Manual search trigger (bypasses debounce)
   */
  const search = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    await performSearch(searchQuery);
  }, [performSearch]);

  /**
   * Clear all search state
   */
  const clear = useCallback(() => {
    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Clear debounce timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    setQuery('');
    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  /**
   * Handle debounced search when query changes
   */
  useEffect(() => {
    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // If query is empty or too short, clear results immediately
    if (!query || query.length < minLength) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Show loading during delay if option is enabled
    if (showLoadingDuringDelay) {
      setIsLoading(true);
    }

    // Set up debounce timer
    timerRef.current = setTimeout(() => {
      performSearch(query);
    }, delay);

    // Cleanup on unmount or query change
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [query, delay, minLength, performSearch, showLoadingDuringDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isLoading,
    error,
    clear,
    search,
  };
}

/**
 * Simple debounce hook for values
 * 
 * @param value - Value to debounce
 * @param delay - Debounce delay in milliseconds
 * @returns Debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
