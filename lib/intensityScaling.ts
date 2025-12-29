/**
 * Intensity Scaling Utilities
 *
 * Implements intensity scaling for the youth sports training app.
 * The system applies **Target Intensity** as a dynamic modifier that adjusts
 * **ALL prescription variables** for both weighted and bodyweight exercises.
 *
 * Intensity Levels:
 * - Low: Lighter load, fewer sets, longer rest, lower RPE
 * - Moderate: Baseline prescription from template
 * - High: Heavier load, more sets, fewer reps, shorter rest, higher RPE
 */

import type { Intensity } from "../types";

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface IntensityConfig {
  oneRepMaxPercent: { min: number; max: number };
  setsMultiplier: number;
  repsMultiplier: number;
  restMultiplier: number;
  rpeTarget: { min: number; max: number };
}

/**
 * Complete Intensity Matrix
 *
 * | Variable          | Low       | Moderate  | High      |
 * |-------------------|-----------|-----------|-----------|
 * | Weight (% of 1RM) | 60-70%    | 75-80%    | 85-90%    |
 * | Sets              | 0.75x     | 1x        | 1.25x     |
 * | Reps              | 1x        | 1x        | 0.85x     |
 * | Rest              | 1.25x     | 1x        | 0.75x     |
 * | RPE Target        | 5-6       | 6-7       | 8-9       |
 */
export const INTENSITY_CONFIG: Record<Intensity, IntensityConfig> = {
  Low: {
    oneRepMaxPercent: { min: 0.60, max: 0.70 },
    setsMultiplier: 0.75,
    repsMultiplier: 1.0,
    restMultiplier: 1.25,
    rpeTarget: { min: 5, max: 6 },
  },
  Moderate: {
    oneRepMaxPercent: { min: 0.75, max: 0.80 },
    setsMultiplier: 1.0,
    repsMultiplier: 1.0,
    restMultiplier: 1.0,
    rpeTarget: { min: 6, max: 7 },
  },
  High: {
    oneRepMaxPercent: { min: 0.85, max: 0.90 },
    setsMultiplier: 1.25,
    repsMultiplier: 0.85,
    restMultiplier: 0.75,
    rpeTarget: { min: 8, max: 9 },
  },
};

/**
 * Bodyweight-specific intensity modifiers for reps/duration scaling
 *
 * | Intensity | Reps Modifier   | Duration Modifier |
 * |-----------|-----------------|-------------------|
 * | Low       | 0.67x (≈2/3)    | 0.67x (≈2/3)      |
 * | Moderate  | 1x              | 1x                |
 * | High      | 1.33x (≈4/3)    | 1.33x (≈4/3)      |
 */
export const BODYWEIGHT_INTENSITY_CONFIG: Record<Intensity, { repsMultiplier: number; durationMultiplier: number }> = {
  Low: {
    repsMultiplier: 0.67,
    durationMultiplier: 0.67,
  },
  Moderate: {
    repsMultiplier: 1.0,
    durationMultiplier: 1.0,
  },
  High: {
    repsMultiplier: 1.33,
    durationMultiplier: 1.33,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTED EXERCISE SCALING
// ═══════════════════════════════════════════════════════════════════════════════

export interface WeightedPrescription {
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface ScaledWeightedPrescription {
  sets: number;
  reps: number;
  restSeconds: number;
  weight?: number;           // Only provided if 1RM is known
  percentOf1RM: number;      // Always provided for display
  rpeTarget: { min: number; max: number };
}

/**
 * Apply intensity scaling to a weighted exercise prescription.
 *
 * @param prescription - Base prescription from template (sets, reps, restSeconds)
 * @param intensity - Target intensity level (Low, Moderate, High)
 * @param oneRepMax - Optional 1RM for calculating actual weight
 * @returns Scaled prescription with weight (if 1RM known) and RPE guidance
 *
 * @example
 * // Back Squat with 1RM of 200 lbs
 * const base = { sets: 4, reps: 8, restSeconds: 60 };
 * applyIntensityToWeighted(base, "High", 200);
 * // Returns: { sets: 5, reps: 7, restSeconds: 45, weight: 175, percentOf1RM: 88, rpeTarget: { min: 8, max: 9 } }
 */
export function applyIntensityToWeighted(
  prescription: WeightedPrescription,
  intensity: Intensity,
  oneRepMax?: number
): ScaledWeightedPrescription {
  const config = INTENSITY_CONFIG[intensity];
  const avgPercent = (config.oneRepMaxPercent.min + config.oneRepMaxPercent.max) / 2;

  // Apply multipliers and ensure minimums
  const scaledSets = Math.max(1, Math.round(prescription.sets * config.setsMultiplier));
  const scaledReps = Math.max(1, Math.round(prescription.reps * config.repsMultiplier));
  const scaledRest = Math.max(15, Math.round(prescription.restSeconds * config.restMultiplier));

  return {
    sets: scaledSets,
    reps: scaledReps,
    restSeconds: scaledRest,
    weight: oneRepMax ? Math.round(oneRepMax * avgPercent) : undefined,
    percentOf1RM: Math.round(avgPercent * 100),
    rpeTarget: config.rpeTarget,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BODYWEIGHT EXERCISE SCALING
// ═══════════════════════════════════════════════════════════════════════════════

export interface BodyweightPrescription {
  reps: string;              // "10", "30s", "10-12", "AMRAP", "2 min"
  restSeconds: number;
}

export interface ExerciseProgressions {
  easier?: string;           // Slug of easier variant
  harder?: string;           // Slug of harder variant
}

export interface ScaledBodyweightPrescription {
  exerciseSlug: string;      // The exercise to perform (base or variant)
  isSubstituted: boolean;    // Whether a variant was used
  reps: string;              // Scaled reps/duration string
  restSeconds: number;
  rpeTarget: { min: number; max: number };
}

/**
 * Parse a reps/duration string and extract the numeric value and unit.
 *
 * Supported formats:
 * - "10" → { value: 10, unit: "reps" }
 * - "30s" → { value: 30, unit: "seconds" }
 * - "2 min" → { value: 120, unit: "seconds" }
 * - "10-12" → { value: 11, unit: "reps" } (uses midpoint)
 * - "AMRAP" → null (cannot scale)
 * - "5 each side" → { value: 5, unit: "reps", suffix: " each side" }
 */
export function parseRepsString(reps: string): {
  value: number;
  unit: "reps" | "seconds";
  suffix?: string;
} | null {
  const trimmed = reps.trim().toLowerCase();

  // Handle AMRAP - cannot scale
  if (trimmed === "amrap") {
    return null;
  }

  // Handle "each side", "per side", "each leg", etc.
  const sideMatch = reps.match(/^([\d\s\-]+)\s*(each|per)\s+(side|leg|arm)/i);
  if (sideMatch) {
    const numPart = sideMatch[1].trim();
    const suffix = reps.substring(numPart.length);
    
    // Parse the numeric part
    if (numPart.includes("-")) {
      const [min, max] = numPart.split("-").map(Number);
      return { value: Math.round((min + max) / 2), unit: "reps", suffix };
    }
    return { value: parseInt(numPart, 10), unit: "reps", suffix };
  }

  // Handle minutes: "2 min", "2min", "2 minutes"
  const minMatch = reps.match(/^(\d+(?:\.\d+)?)\s*min(?:utes?)?$/i);
  if (minMatch) {
    return { value: parseFloat(minMatch[1]) * 60, unit: "seconds" };
  }

  // Handle seconds: "30s", "30 sec", "30 seconds"
  const secMatch = reps.match(/^(\d+(?:\.\d+)?)\s*s(?:ec(?:onds?)?)?$/i);
  if (secMatch) {
    return { value: parseFloat(secMatch[1]), unit: "seconds" };
  }

  // Handle ranges: "10-12" (use midpoint)
  const rangeMatch = reps.match(/^(\d+)\s*-\s*(\d+)$/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    return { value: Math.round((min + max) / 2), unit: "reps" };
  }

  // Handle plain numbers: "10"
  const numMatch = reps.match(/^(\d+)$/);
  if (numMatch) {
    return { value: parseInt(numMatch[1], 10), unit: "reps" };
  }

  // Cannot parse
  return null;
}

/**
 * Format a scaled value back to a string.
 *
 * @param value - Numeric value
 * @param unit - Unit type (reps or seconds)
 * @param suffix - Optional suffix (e.g., " each side")
 * @returns Formatted string
 */
export function formatScaledValue(
  value: number,
  unit: "reps" | "seconds",
  suffix?: string
): string {
  if (unit === "seconds") {
    // Round to nearest 5 seconds for cleaner display
    const rounded = Math.round(value / 5) * 5;
    const clampedSeconds = Math.max(5, rounded); // Minimum 5 seconds
    
    if (clampedSeconds >= 60 && clampedSeconds % 60 === 0) {
      return `${clampedSeconds / 60} min`;
    }
    return `${clampedSeconds}s`;
  }

  // Reps - round to nearest whole number
  const rounded = Math.max(1, Math.round(value));
  return suffix ? `${rounded}${suffix}` : String(rounded);
}

/**
 * Scale a reps/duration string by a multiplier.
 *
 * @param reps - Original reps string (e.g., "10", "30s", "10-12")
 * @param multiplier - Scaling multiplier
 * @returns Scaled reps string, or original if cannot parse
 */
export function scaleRepsOrDuration(reps: string, multiplier: number): string {
  const parsed = parseRepsString(reps);
  if (!parsed) {
    // Cannot scale (e.g., AMRAP), return original
    return reps;
  }

  const scaledValue = parsed.value * multiplier;
  return formatScaledValue(scaledValue, parsed.unit, parsed.suffix);
}

/**
 * Apply intensity scaling to a bodyweight exercise prescription.
 *
 * For bodyweight exercises, intensity is applied via TWO mechanisms:
 * 1. Reps/Duration Scaling - increase or decrease volume
 * 2. Progression Variant Selection - substitute with easier/harder variant
 *
 * @param prescription - Base prescription from template
 * @param intensity - Target intensity level
 * @param baseExerciseSlug - Slug of the base exercise
 * @param exerciseProgressions - Optional easier/harder variants
 * @returns Scaled prescription with exercise slug (may be substituted)
 *
 * @example
 * // Push-up at High intensity
 * const base = { reps: "10", restSeconds: 30 };
 * applyIntensityToBodyweight(base, "High", "push_up", { harder: "decline_push_up" });
 * // Returns: { exerciseSlug: "decline_push_up", isSubstituted: true, reps: "13", restSeconds: 23, rpeTarget: { min: 8, max: 9 } }
 */
export function applyIntensityToBodyweight(
  prescription: BodyweightPrescription,
  intensity: Intensity,
  baseExerciseSlug: string,
  exerciseProgressions?: ExerciseProgressions
): ScaledBodyweightPrescription {
  const config = INTENSITY_CONFIG[intensity];
  const bwConfig = BODYWEIGHT_INTENSITY_CONFIG[intensity];

  // Parse to determine if this is a duration or rep-based exercise
  const parsed = parseRepsString(prescription.reps);
  const multiplier = parsed?.unit === "seconds" 
    ? bwConfig.durationMultiplier 
    : bwConfig.repsMultiplier;

  // Scale the reps/duration
  const scaledReps = scaleRepsOrDuration(prescription.reps, multiplier);

  // Determine which exercise variant to use based on intensity
  let exerciseSlug: string;
  switch (intensity) {
    case "Low":
      // Use easier variant if available, otherwise base
      exerciseSlug = exerciseProgressions?.easier ?? baseExerciseSlug;
      break;
    case "Moderate":
      // Use base exercise
      exerciseSlug = baseExerciseSlug;
      break;
    case "High":
      // Use harder variant if available, otherwise base
      exerciseSlug = exerciseProgressions?.harder ?? baseExerciseSlug;
      break;
  }

  return {
    exerciseSlug,
    isSubstituted: exerciseSlug !== baseExerciseSlug,
    reps: scaledReps,
    restSeconds: Math.max(15, Math.round(prescription.restSeconds * config.restMultiplier)),
    rpeTarget: config.rpeTarget,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1RM CALCULATION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate estimated 1RM using the Epley formula.
 *
 * Formula: 1RM = weight × (1 + reps/30)
 *
 * @param weight - Weight lifted
 * @param reps - Number of repetitions performed
 * @returns Estimated 1RM
 *
 * @example
 * calculateOneRepMax(100, 10);
 * // Returns: 133 (100 × (1 + 10/30))
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) {
    return 0;
  }
  
  if (reps === 1) {
    // If only 1 rep was performed, weight IS the 1RM
    return weight;
  }

  // Epley formula: 1RM = weight × (1 + reps/30)
  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate target weight for a given percentage of 1RM.
 *
 * @param oneRepMax - Athlete's 1RM for the exercise
 * @param percent - Target percentage (0-1)
 * @returns Target weight rounded to nearest 2.5
 */
export function calculateTargetWeight(oneRepMax: number, percent: number): number {
  const targetWeight = oneRepMax * percent;
  // Round to nearest 2.5 lbs (common weight increments)
  return Math.round(targetWeight / 2.5) * 2.5;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXERCISE TYPE DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determine if an exercise is bodyweight-only based on its equipment tags.
 *
 * An exercise is considered bodyweight if:
 * - equipment is undefined/empty, OR
 * - equipment only contains "bodyweight"
 *
 * @param equipment - Array of equipment slugs from exercise
 * @returns true if exercise is bodyweight-only
 */
export function isBodyweightExercise(equipment?: string[]): boolean {
  if (!equipment || equipment.length === 0) {
    return true;
  }
  return equipment.length === 1 && equipment[0] === "bodyweight";
}
