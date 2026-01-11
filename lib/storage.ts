import { MMKV } from 'react-native-mmkv';

// Main storage instance
export const storage = new MMKV({
  id: 'wander-fit-storage',
});

// Type-safe helpers for MMKV storage
export const mmkvStorage = {
  // String operations
  getString: (key: string): string | undefined => storage.getString(key),
  setString: (key: string, value: string): void => storage.set(key, value),

  // Number operations
  getNumber: (key: string): number | undefined => storage.getNumber(key),
  setNumber: (key: string, value: number): void => storage.set(key, value),

  // Boolean operations
  getBoolean: (key: string): boolean | undefined => storage.getBoolean(key),
  setBoolean: (key: string, value: boolean): void => storage.set(key, value),

  // JSON object helpers
  getObject: <T>(key: string): T | null => {
    const value = storage.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  },
  setObject: <T>(key: string, value: T): void => {
    storage.set(key, JSON.stringify(value));
  },

  // Cache with timestamp for staleness detection
  setWithTimestamp: <T>(key: string, data: T): void => {
    storage.set(
      key,
      JSON.stringify({
        data,
        cachedAt: Date.now(),
      })
    );
  },
  getWithTimestamp: <T>(
    key: string
  ): { data: T; cachedAt: number } | null => {
    const value = storage.getString(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as { data: T; cachedAt: number };
    } catch {
      return null;
    }
  },

  // Utility methods
  delete: (key: string): void => storage.delete(key),
  contains: (key: string): boolean => storage.contains(key),
  getAllKeys: (): string[] => storage.getAllKeys(),
  clearAll: (): void => storage.clearAll(),

  // Clear all cache keys (preserves non-cache data)
  clearCache: (): void => {
    const allKeys = storage.getAllKeys();
    allKeys.forEach((key) => {
      if (key.startsWith('cache:')) {
        storage.delete(key);
      }
    });
  },
};

// Cache key constants
export const CACHE_KEYS = {
  // Athlete history & analytics
  WORKOUT_HISTORY: 'cache:workout_history',
  USER_MAXES: 'cache:user_maxes',
  PROGRESS_SUMMARY: 'cache:progress_summary',
  PERFORMANCE_TRENDS: 'cache:performance_trends',
  WEEKLY_TRENDS: 'cache:weekly_trends',
  EXERCISE_BREAKDOWN: 'cache:exercise_breakdown',
  INTENSITY_DISTRIBUTION: 'cache:intensity_distribution',

  // Parent view
  LINKED_ATHLETES: 'cache:linked_athletes',
  ATHLETE_OVERVIEW: (athleteId: string) => `cache:athlete_overview:${athleteId}`,
  ATHLETE_HISTORY: (athleteId: string) => `cache:athlete_history:${athleteId}`,

  // Trainer view
  ATHLETES_OVERVIEW: 'cache:athletes_overview',
  COHORT_STATS: 'cache:cohort_stats',
  ATHLETE_DEEP_DIVE: (athleteId: string) => `cache:athlete_deep_dive:${athleteId}`,
} as const;

// Default stale times (in milliseconds)
export const STALE_TIMES = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 24 hours
} as const;
