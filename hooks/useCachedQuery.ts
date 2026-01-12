import { useQuery } from 'convex/react';
import { useEffect, useState, useCallback } from 'react';
import { mmkvStorage, STALE_TIMES } from '@/lib/storage';
import type { FunctionReference, FunctionArgs, FunctionReturnType } from 'convex/server';

interface CacheOptions {
  /** The key to use for caching this query's results */
  cacheKey: string;
  /** Time in ms before data is considered stale (default: 24 hours) */
  staleTime?: number;
  /** Whether to skip the query entirely */
  skip?: boolean;
}

interface CachedQueryResult<T> {
  /** The data from the query (live or cached) */
  data: T | null;
  /** Whether the initial load is in progress */
  isLoading: boolean;
  /** Whether data is being served from cache */
  isFromCache: boolean;
  /** Whether cached data is considered stale */
  isStale: boolean;
  /** Manually clear the cache for this query */
  clearCache: () => void;
  /** The timestamp when data was last cached */
  cachedAt: number | null;
}

/**
 * A hook that wraps useQuery with MMKV caching for offline support.
 *
 * - Shows cached data immediately while fetching fresh data
 * - Indicates when data is stale (older than staleTime)
 * - Automatically updates cache when fresh data arrives
 *
 * @example
 * ```tsx
 * const { data, isLoading, isFromCache, isStale } = useCachedQuery(
 *   api.workoutSessions.getHistory,
 *   { limit: 20 },
 *   { cacheKey: CACHE_KEYS.WORKOUT_HISTORY }
 * );
 * ```
 */
export function useCachedQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  args: FunctionArgs<Query> | 'skip',
  options: CacheOptions
): CachedQueryResult<FunctionReturnType<Query>> {
  const { cacheKey, staleTime = STALE_TIMES.LONG, skip = false } = options;

  type ReturnType = FunctionReturnType<Query>;

  const [cachedData, setCachedData] = useState<ReturnType | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [hasLoadedCache, setHasLoadedCache] = useState(false);

  // Load from cache on mount
  useEffect(() => {
    if (skip) {
      setHasLoadedCache(true);
      return;
    }

    const cached = mmkvStorage.getWithTimestamp<ReturnType>(cacheKey);
    if (cached) {
      setCachedData(cached.data);
      setCachedAt(cached.cachedAt);
      setIsStale(Date.now() - cached.cachedAt > staleTime);
    }
    setHasLoadedCache(true);
  }, [cacheKey, staleTime, skip]);

  // Convex query (live data)
  const liveData = useQuery(query, skip || args === 'skip' ? 'skip' : args);

  // Track if we've received live data (to distinguish undefined from null)
  const [hasReceivedLiveData, setHasReceivedLiveData] = useState(false);

  // Update cache when live data arrives (including null responses)
  useEffect(() => {
    // undefined means query is still loading, anything else (including null) is a result
    if (liveData !== undefined && !skip) {
      mmkvStorage.setWithTimestamp(cacheKey, liveData);
      setCachedData(liveData as ReturnType);
      setCachedAt(Date.now());
      setIsStale(false);
      setHasReceivedLiveData(true);
    }
  }, [liveData, cacheKey, skip]);

  // Clear cache function
  const clearCache = useCallback(() => {
    mmkvStorage.delete(cacheKey);
    setCachedData(null);
    setCachedAt(null);
    setIsStale(false);
    setHasReceivedLiveData(false);
  }, [cacheKey]);

  // Determine the current state
  const hasLiveData = liveData !== undefined;
  const hasCachedData = cachedData !== null || hasReceivedLiveData;

  // Use live data if query has completed, otherwise fall back to cache
  const data = hasLiveData ? (liveData as ReturnType) : cachedData;

  // Loading state: query hasn't returned AND no cache AND haven't finished loading cache
  const isLoading = !hasLiveData && cachedData === null && !hasLoadedCache;

  // From cache: we're showing cached data while live data is still loading
  const isFromCache = !hasLiveData && cachedData !== null;

  return {
    data,
    isLoading,
    isFromCache,
    isStale: isFromCache ? isStale : false,
    clearCache,
    cachedAt,
  };
}

/**
 * A simpler version for queries that don't need args
 */
export function useCachedQueryNoArgs<Query extends FunctionReference<'query'>>(
  query: Query,
  options: CacheOptions
): CachedQueryResult<FunctionReturnType<Query>> {
  return useCachedQuery(query, {} as FunctionArgs<Query>, options);
}
