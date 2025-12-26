/**
 * Workout Utility Functions
 *
 * Pure functions for parsing exercise data and categorizing exercises.
 */

/**
 * Tags that indicate cardio/movement exercises
 */
export const CARDIO_TAGS = [
  "cardio",
  "run",
  "walk",
  "jump",
  "plyometric",
  "sprint",
  "jog",
  "conditioning",
] as const;

/**
 * Parse prescribed reps string to extract the numeric value
 *
 * @param repsStr - Rep prescription string (e.g., "10", "10-12", "AMRAP", "30s")
 * @returns number - The first number found, or 10 as default
 *
 * Examples:
 * - "10" → 10
 * - "10-12" → 10 (first number in range)
 * - "8-10" → 8
 * - "AMRAP" → 10 (default, no number found)
 * - "30s" → 30
 * - "" → 10 (default)
 * - "5+" → 5
 */
export function parseReps(repsStr: string): number {
  const match = repsStr.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 10;
}

/**
 * Check if an exercise is a cardio/movement exercise based on its tags
 *
 * @param tags - Array of exercise tags
 * @returns boolean - True if any tag matches a cardio tag
 *
 * Cardio tags: cardio, run, walk, jump, plyometric, sprint, jog, conditioning
 * Matching is case-insensitive.
 */
export function isCardioExercise(tags: string[]): boolean {
  return tags.some((tag) =>
    CARDIO_TAGS.includes(tag.toLowerCase() as (typeof CARDIO_TAGS)[number])
  );
}

