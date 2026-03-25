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

export interface TrackableSetData {
  repsCompleted?: number;
  durationSeconds?: number;
  weight?: number;
  rpe?: number;
  completed: boolean;
  skipped: boolean;
}

/**
 * Align a set-tracking array with the current prescribed set count.
 *
 * This is used when session data was initialized from the unscaled template,
 * but the UI is rendering a scaled prescription. It preserves existing set data
 * and pads or trims the array so the number of set pills matches the current
 * prescription.
 */
export function normalizeTrackedSets<T extends TrackableSetData>(
  sets: T[],
  prescribedSets: number
): T[] {
  const targetCount = Math.max(1, prescribedSets);

  if (sets.length === targetCount) {
    return sets;
  }

  if (sets.length > targetCount) {
    return sets.slice(0, targetCount);
  }

  return [
    ...sets,
    ...Array.from({ length: targetCount - sets.length }, () => ({
      completed: false,
      skipped: false,
    } as T)),
  ];
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

/**
 * Frontend intensity levels for UI theming
 */
export type IntensityLevel = "low" | "medium" | "high";

/**
 * Backend intensity values from Convex schema
 */
export type BackendIntensity = "Low" | "Moderate" | "High";

/**
 * Mapping from backend intensity values to frontend IntensityLevel
 */
const INTENSITY_MAPPING: Record<BackendIntensity, IntensityLevel> = {
  Low: "low",
  Moderate: "medium",
  High: "high",
};

/**
 * Convert backend intensity value to frontend IntensityLevel
 *
 * @param backendIntensity - Intensity value from Convex ("Low" | "Moderate" | "High")
 * @returns IntensityLevel - Frontend-friendly value ("low" | "medium" | "high")
 *
 * Examples:
 * - "Low" → "low"
 * - "Moderate" → "medium"
 * - "High" → "high"
 * - undefined → "medium" (default)
 * - null → "medium" (default)
 * - "Invalid" → "medium" (fallback)
 */
export function mapIntensityToLevel(
  backendIntensity: string | undefined | null
): IntensityLevel {
  if (!backendIntensity) {
    return "medium";
  }
  return INTENSITY_MAPPING[backendIntensity as BackendIntensity] || "medium";
}

