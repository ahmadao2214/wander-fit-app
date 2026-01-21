/**
 * Intensity Scaling Utilities
 *
 * SINGLE SOURCE OF TRUTH for intensity scaling logic.
 * This module is imported by both:
 * - convex/programTemplates.ts (for backend queries)
 * - lib/intensityScaling.ts (re-exports for frontend code)
 *
 * This architecture ensures zero code duplication while respecting
 * Convex's import constraints.
 *
 * Intensity Levels:
 * - Low: Lighter load, fewer sets, longer rest, lower RPE
 * - Moderate: Baseline prescription from template
 * - High: Heavier load, more sets, fewer reps, shorter rest, higher RPE
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Intensity = "Low" | "Moderate" | "High";
export type AgeGroup = "10-13" | "14-17" | "18+";
export type Phase = "GPP" | "SPP" | "SSP";

// Category-specific intensity types
export type CategoryId = 1 | 2 | 3 | 4;
export type ExperienceBucket = "0-1" | "2-5" | "6+";
export type ExerciseFocus = "strength" | "power" | "bodyweight";
export type PositionType = "lowest" | "lowest_plus_1" | "lowest_plus_2" | "second_lowest" | "middle" | "max_minus_2" | "max_minus_1" | "max";

export interface IntensityConfig {
  oneRepMaxPercent: { min: number; max: number };
  setsMultiplier: number;
  repsMultiplier: number;
  restMultiplier: number;
  rpeTarget: { min: number; max: number };
}

export interface WeightedPrescription {
  sets: number;
  reps: number;
  restSeconds: number;
}

export interface ScaledWeightedPrescription {
  sets: number;
  reps: number;
  restSeconds: number;
  weight?: number;
  percentOf1RM: number;
  rpeTarget: { min: number; max: number };
}

export interface BodyweightPrescription {
  reps: string;
  restSeconds: number;
}

export interface ExerciseProgressions {
  easier?: string;
  harder?: string;
}

export interface ScaledBodyweightPrescription {
  exerciseSlug: string;
  isSubstituted: boolean;
  reps: string;
  restSeconds: number;
  rpeTarget: { min: number; max: number };
}

export interface AgeIntensityRules {
  maxIntensity: Intensity;
  oneRepMaxCeiling: number;
  plyometricAllowed: boolean;
  maxSetsPerExercise: number;
  maxRepsMultiplier: number;
}

export interface PhaseIntensityRange {
  min: number;
  max: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC INTENSITY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParameterRange {
  min: number;
  max: number;
}

export interface Tempo {
  eccentric: number | "x";
  isometric: number | "x";
  concentric: number | "x";
}

export interface CategoryPhaseConfig {
  oneRepMaxPercent: {
    strength: ParameterRange;
    power: ParameterRange;
  };
  reps: {
    strength: ParameterRange;
    power: ParameterRange;
  };
  sets: ParameterRange;
  restSeconds: {
    strength: number;
    power: number;
  };
  tempo: Tempo;
  rpe: ParameterRange;
}

export interface AgeExperienceModifier {
  setsPosition: PositionType;
  repsPosition: PositionType;
}

export interface ScaledCategoryParameters {
  oneRepMaxPercent: ParameterRange;
  sets: number;
  reps: number;
  restSeconds: number;
  tempo: Tempo;
  rpe: ParameterRange;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENSITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Complete Intensity Matrix for Weighted Exercises
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
// AGE-BASED INTENSITY RULES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Age Group Intensity Rules
 *
 * These rules modify workout prescriptions based on athlete age:
 * - maxIntensity: Ceiling for intensity level selection
 * - oneRepMaxCeiling: Maximum % of 1RM allowed
 * - plyometricAllowed: Whether explosive movements are permitted
 * - maxSetsPerExercise: Cap on sets per exercise
 * - maxRepsMultiplier: Adjustment for rep ranges (higher = more reps, lower weight)
 *
 * | Age Group | Max Intensity | 1RM Ceiling | Plyometrics | Max Sets |
 * |-----------|---------------|-------------|-------------|----------|
 * | 10-13     | Moderate      | 65%         | Yes         | 3        |
 * | 14-17     | High          | 85%         | Yes         | 5        |
 * | 18+       | High          | 90%         | Yes         | 6        |
 */
export const AGE_INTENSITY_RULES: Record<AgeGroup, AgeIntensityRules> = {
  "10-13": {
    maxIntensity: "Moderate",
    oneRepMaxCeiling: 0.65,
    plyometricAllowed: true,
    maxSetsPerExercise: 3,
    maxRepsMultiplier: 1.2, // Higher reps, lower weight for younger athletes
  },
  "14-17": {
    maxIntensity: "High",
    oneRepMaxCeiling: 0.85,
    plyometricAllowed: true,
    maxSetsPerExercise: 5,
    maxRepsMultiplier: 1.0,
  },
  "18+": {
    maxIntensity: "High",
    oneRepMaxCeiling: 0.90, // Cap at 90%, can push to 95% for peaking
    plyometricAllowed: true,
    maxSetsPerExercise: 6,
    maxRepsMultiplier: 1.0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE-BASED INTENSITY RANGES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Phase-Specific 1RM Ranges
 *
 * These define the appropriate loading ranges for each training phase:
 *
 * | Phase | 1RM Range | Focus |
 * |-------|-----------|-------|
 * | GPP   | 60-75%    | Foundation, movement quality, work capacity |
 * | SPP   | 75-85%    | Sport-specific strength, power development |
 * | SSP   | 85-90%    | Peaking, maintain gains, competition prep |
 */
export const PHASE_INTENSITY_RANGES: Record<Phase, PhaseIntensityRange> = {
  GPP: { min: 0.60, max: 0.75 },
  SPP: { min: 0.75, max: 0.85 },
  SSP: { min: 0.85, max: 0.90 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC INTENSITY CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Category-Phase Configuration Matrix
 *
 * Each sport category has specific parameters for each training phase.
 * Parameters include 1RM%, reps, sets, rest, tempo, and RPE.
 *
 * Categories:
 * - 1: Endurance (Soccer, Hockey, Lacrosse)
 * - 2: Power (Basketball, Volleyball)
 * - 3: Rotational (Baseball, Tennis, Golf)
 * - 4: Strength (Wrestling, Football)
 */
export const CATEGORY_PHASE_CONFIG: Record<CategoryId, Record<Phase, CategoryPhaseConfig>> = {
  // Category 1: Endurance (Soccer, Hockey, Lacrosse)
  1: {
    GPP: {
      oneRepMaxPercent: { strength: { min: 0.50, max: 0.65 }, power: { min: 0.30, max: 0.30 } },
      reps: { strength: { min: 10, max: 14 }, power: { min: 6, max: 8 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 30, power: 60 },
      tempo: { eccentric: 2, isometric: 1, concentric: 2 },
      rpe: { min: 6, max: 7 },
    },
    SPP: {
      oneRepMaxPercent: { strength: { min: 0.65, max: 0.75 }, power: { min: 0.40, max: 0.40 } },
      reps: { strength: { min: 6, max: 8 }, power: { min: 4, max: 6 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 60, power: 60 },
      tempo: { eccentric: 2, isometric: 0, concentric: 2 },
      rpe: { min: 7, max: 8 },
    },
    SSP: {
      oneRepMaxPercent: { strength: { min: 0.75, max: 0.80 }, power: { min: 0.55, max: 0.55 } },
      reps: { strength: { min: 4, max: 6 }, power: { min: 4, max: 6 } },
      sets: { min: 3, max: 5 },
      restSeconds: { strength: 60, power: 60 },
      tempo: { eccentric: "x", isometric: "x", concentric: "x" },
      rpe: { min: 8, max: 9 },
    },
  },
  // Category 2: Power (Basketball, Volleyball)
  2: {
    GPP: {
      oneRepMaxPercent: { strength: { min: 0.55, max: 0.65 }, power: { min: 0.35, max: 0.35 } },
      reps: { strength: { min: 10, max: 14 }, power: { min: 6, max: 8 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 30, power: 60 },
      tempo: { eccentric: 1, isometric: 1, concentric: 1 },
      rpe: { min: 6, max: 7 },
    },
    SPP: {
      oneRepMaxPercent: { strength: { min: 0.65, max: 0.80 }, power: { min: 0.45, max: 0.45 } },
      reps: { strength: { min: 8, max: 12 }, power: { min: 4, max: 6 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 60, power: 60 },
      tempo: { eccentric: 2, isometric: 0, concentric: 2 },
      rpe: { min: 7, max: 8 },
    },
    SSP: {
      oneRepMaxPercent: { strength: { min: 0.80, max: 0.90 }, power: { min: 0.50, max: 0.60 } },
      reps: { strength: { min: 4, max: 6 }, power: { min: 3, max: 6 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 120, power: 120 },
      tempo: { eccentric: "x", isometric: "x", concentric: "x" },
      rpe: { min: 9, max: 9 },
    },
  },
  // Category 3: Rotational (Baseball, Tennis, Golf)
  3: {
    GPP: {
      oneRepMaxPercent: { strength: { min: 0.50, max: 0.60 }, power: { min: 0.30, max: 0.30 } },
      reps: { strength: { min: 10, max: 14 }, power: { min: 8, max: 10 } },
      sets: { min: 2, max: 4 },
      restSeconds: { strength: 40, power: 60 },
      tempo: { eccentric: 2, isometric: 0, concentric: 2 },
      rpe: { min: 6, max: 7 },
    },
    SPP: {
      oneRepMaxPercent: { strength: { min: 0.60, max: 0.70 }, power: { min: 0.35, max: 0.40 } },
      reps: { strength: { min: 8, max: 12 }, power: { min: 6, max: 8 } },
      sets: { min: 3, max: 5 },
      restSeconds: { strength: 90, power: 60 },
      tempo: { eccentric: 2, isometric: 0, concentric: 2 },
      rpe: { min: 7, max: 8 },
    },
    SSP: {
      oneRepMaxPercent: { strength: { min: 0.70, max: 0.85 }, power: { min: 0.50, max: 0.50 } },
      reps: { strength: { min: 4, max: 6 }, power: { min: 3, max: 6 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 120, power: 120 },
      tempo: { eccentric: "x", isometric: "x", concentric: "x" },
      rpe: { min: 8, max: 9 },
    },
  },
  // Category 4: Strength (Wrestling, Football)
  4: {
    GPP: {
      oneRepMaxPercent: { strength: { min: 0.60, max: 0.70 }, power: { min: 0.35, max: 0.40 } },
      reps: { strength: { min: 10, max: 12 }, power: { min: 6, max: 8 } },
      sets: { min: 3, max: 5 },
      restSeconds: { strength: 30, power: 60 },
      tempo: { eccentric: 2, isometric: 1, concentric: 2 },
      rpe: { min: 7, max: 7 },
    },
    SPP: {
      oneRepMaxPercent: { strength: { min: 0.70, max: 0.85 }, power: { min: 0.45, max: 0.50 } },
      reps: { strength: { min: 8, max: 12 }, power: { min: 4, max: 6 } },
      sets: { min: 4, max: 5 },
      restSeconds: { strength: 90, power: 60 },
      tempo: { eccentric: 2, isometric: 0, concentric: 2 },
      rpe: { min: 7, max: 9 },
    },
    SSP: {
      oneRepMaxPercent: { strength: { min: 0.85, max: 0.90 }, power: { min: 0.55, max: 0.55 } },
      reps: { strength: { min: 3, max: 5 }, power: { min: 3, max: 6 } },
      sets: { min: 4, max: 6 },
      restSeconds: { strength: 120, power: 120 },
      tempo: { eccentric: "x", isometric: "x", concentric: "x" },
      rpe: { min: 8, max: 9 },
    },
  },
};

/**
 * Age + Experience Matrix
 *
 * Determines position within parameter ranges based on age group and experience.
 * For example, if sets range is 4-6:
 * - "lowest" = 4
 * - "middle" = 5
 * - "max" = 6
 */
export const AGE_EXPERIENCE_MATRIX: Record<AgeGroup, Record<ExperienceBucket, AgeExperienceModifier>> = {
  "10-13": {
    "0-1": { setsPosition: "lowest", repsPosition: "lowest" },
    "2-5": { setsPosition: "lowest_plus_1", repsPosition: "lowest_plus_2" },
    "6+": { setsPosition: "second_lowest", repsPosition: "max_minus_1" },
  },
  "14-17": {
    "0-1": { setsPosition: "middle", repsPosition: "middle" },
    "2-5": { setsPosition: "max", repsPosition: "max_minus_1" },
    "6+": { setsPosition: "max", repsPosition: "max" },
  },
  "18+": {
    "0-1": { setsPosition: "max", repsPosition: "max_minus_2" },
    "2-5": { setsPosition: "max", repsPosition: "max_minus_1" },
    "6+": { setsPosition: "max", repsPosition: "max" },
  },
};

/**
 * Age Group Safety Constraints
 *
 * Additional safety caps that override category-specific values for younger athletes.
 * - 10-13: Hard cap at 3 sets, 65% 1RM ceiling
 * - 14-17 and 18+: Use category ranges (no additional caps)
 */
export const AGE_SAFETY_CONSTRAINTS: Record<AgeGroup, { maxSets: number | null; oneRepMaxCeiling: number }> = {
  "10-13": { maxSets: 3, oneRepMaxCeiling: 0.65 },
  "14-17": { maxSets: null, oneRepMaxCeiling: 0.85 },
  "18+": { maxSets: null, oneRepMaxCeiling: 0.90 },
};

/**
 * Bodyweight Progression Variant Matrix
 *
 * Determines which exercise variant to use based on phase and experience.
 * - "easier": Use easier progression variant
 * - "base": Use base exercise
 * - "harder": Use harder progression variant
 */
export const BODYWEIGHT_VARIANT_MATRIX: Record<Phase, Record<ExperienceBucket, "easier" | "base" | "harder">> = {
  GPP: {
    "0-1": "easier",
    "2-5": "base",
    "6+": "base",
  },
  SPP: {
    "0-1": "base",
    "2-5": "base",
    "6+": "base",
  },
  SSP: {
    "0-1": "base",
    "2-5": "base",
    "6+": "harder",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// REPS/DURATION PARSING AND SCALING
// ═══════════════════════════════════════════════════════════════════════════════

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
 */
export function formatScaledValue(
  value: number,
  unit: "reps" | "seconds",
  suffix?: string
): string {
  if (unit === "seconds") {
    // Round to nearest 5 seconds for cleaner display
    const rounded = Math.round(value / 5) * 5;
    const clampedSeconds = Math.max(5, rounded);
    
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

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHTED EXERCISE SCALING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Apply intensity scaling to a weighted exercise prescription.
 *
 * @param prescription - Base prescription from template (sets, reps, restSeconds)
 * @param intensity - Target intensity level (Low, Moderate, High)
 * @param oneRepMax - Optional 1RM for calculating actual weight
 * @returns Scaled prescription with weight (if 1RM known) and RPE guidance
 *
 * @example
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

/**
 * Apply intensity scaling to a bodyweight exercise prescription.
 *
 * For bodyweight exercises, intensity is applied via TWO mechanisms:
 * 1. Reps/Duration Scaling - increase or decrease volume
 * 2. Progression Variant Selection - substitute with easier/harder variant
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
      exerciseSlug = exerciseProgressions?.easier ?? baseExerciseSlug;
      break;
    case "Moderate":
      exerciseSlug = baseExerciseSlug;
      break;
    case "High":
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
 * Formula: 1RM = weight × (1 + reps/30)
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) {
    return 0;
  }
  
  if (reps === 1) {
    return weight;
  }

  return Math.round(weight * (1 + reps / 30));
}

/**
 * Calculate target weight for a given percentage of 1RM.
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
 */
export function isBodyweightExercise(equipment?: string[]): boolean {
  if (!equipment || equipment.length === 0) {
    return true;
  }
  return equipment.length === 1 && equipment[0] === "bodyweight";
}

/**
 * Get the average 1RM percentage for an intensity level.
 */
export function getAvgOneRepMaxPercent(intensity: Intensity): number {
  const config = INTENSITY_CONFIG[intensity];
  return (config.oneRepMaxPercent.min + config.oneRepMaxPercent.max) / 2;
}

/**
 * Get the RPE target for an intensity level.
 */
export function getRpeTarget(intensity: Intensity): { min: number; max: number } {
  return INTENSITY_CONFIG[intensity].rpeTarget;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGE & PHASE MODIFIER UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the effective 1RM ceiling based on age group and phase.
 * Takes the minimum of the age ceiling and phase max to ensure safety.
 */
export function getEffectiveOneRepMaxCeiling(ageGroup: AgeGroup, phase: Phase): number {
  const ageRules = AGE_INTENSITY_RULES[ageGroup];
  const phaseRanges = PHASE_INTENSITY_RANGES[phase];
  return Math.min(ageRules.oneRepMaxCeiling, phaseRanges.max);
}

/**
 * Get the 1RM range for a given age group and phase.
 * Adjusts the phase range based on age ceiling.
 */
export function getOneRepMaxRange(
  ageGroup: AgeGroup,
  phase: Phase
): { min: number; max: number } {
  const phaseRanges = PHASE_INTENSITY_RANGES[phase];
  const effectiveCeiling = getEffectiveOneRepMaxCeiling(ageGroup, phase);
  return {
    min: phaseRanges.min,
    max: effectiveCeiling,
  };
}

/**
 * Get the maximum intensity allowed for an age group.
 */
export function getMaxIntensityForAge(ageGroup: AgeGroup): Intensity {
  return AGE_INTENSITY_RULES[ageGroup].maxIntensity;
}

/**
 * Cap the intensity based on age group restrictions.
 */
export function capIntensityForAge(intensity: Intensity, ageGroup: AgeGroup): Intensity {
  const maxIntensity = AGE_INTENSITY_RULES[ageGroup].maxIntensity;

  // Intensity ordering: Low < Moderate < High
  const intensityOrder: Intensity[] = ["Low", "Moderate", "High"];
  const requestedIndex = intensityOrder.indexOf(intensity);
  const maxIndex = intensityOrder.indexOf(maxIntensity);

  return intensityOrder[Math.min(requestedIndex, maxIndex)];
}

/**
 * Get the maximum sets allowed for an exercise based on age group.
 */
export function getMaxSetsForAge(ageGroup: AgeGroup): number {
  return AGE_INTENSITY_RULES[ageGroup].maxSetsPerExercise;
}

/**
 * Apply all age-based modifiers to a prescription.
 */
export function applyAgeModifiers(
  prescription: {
    sets: number;
    reps: string;
    intensity?: Intensity;
  },
  ageGroup: AgeGroup,
  phase: Phase
): {
  sets: number;
  reps: string;
  intensity: Intensity;
  oneRepMaxRange: { min: number; max: number };
} {
  const ageRules = AGE_INTENSITY_RULES[ageGroup];
  const cappedIntensity = prescription.intensity
    ? capIntensityForAge(prescription.intensity, ageGroup)
    : "Moderate";

  // Cap sets based on age
  const cappedSets = Math.min(prescription.sets, ageRules.maxSetsPerExercise);

  // Scale reps for younger athletes (they do more reps at lower weight)
  const scaledReps =
    ageRules.maxRepsMultiplier !== 1.0
      ? scaleRepsOrDuration(prescription.reps, ageRules.maxRepsMultiplier)
      : prescription.reps;

  return {
    sets: cappedSets,
    reps: scaledReps,
    intensity: cappedIntensity,
    oneRepMaxRange: getOneRepMaxRange(ageGroup, phase),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY-SPECIFIC INTENSITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tags that indicate a power/explosive exercise
 */
const POWER_TAGS = ["power", "explosive", "plyometric", "reactive"];

/**
 * Convert years of experience to an experience bucket.
 */
export function getExperienceBucket(yearsOfExperience: number): ExperienceBucket {
  if (yearsOfExperience <= 1) return "0-1";
  if (yearsOfExperience <= 5) return "2-5";
  return "6+";
}

/**
 * Calculate the exact value from a range given a position.
 *
 * @param range - The min/max range
 * @param position - The position within the range
 * @returns The calculated value
 */
export function getValueFromPosition(range: ParameterRange, position: PositionType): number {
  const { min, max } = range;
  const spread = max - min;

  switch (position) {
    case "lowest":
      return min;
    case "lowest_plus_1":
      return min + 1;
    case "lowest_plus_2":
      return min + 2;
    case "second_lowest":
      return min + 1;
    case "middle":
      return Math.round((min + max) / 2);
    case "max_minus_2":
      return Math.max(min, max - 2);
    case "max_minus_1":
      return Math.max(min, max - 1);
    case "max":
      return max;
    default:
      return Math.round((min + max) / 2);
  }
}

/**
 * Determine the exercise focus type based on tags and equipment.
 *
 * @param tags - Exercise tags
 * @param equipment - Exercise equipment
 * @returns The exercise focus type (strength, power, or bodyweight)
 */
export function getExerciseFocus(tags?: string[], equipment?: string[]): ExerciseFocus {
  // Check if bodyweight
  if (isBodyweightExercise(equipment)) {
  const { min, max } = range;
  }

  // Check for power/explosive tags
  if (tags?.some(tag => POWER_TAGS.includes(tag.toLowerCase()))) {
    return "power";
  }

  // Default to strength
  return "strength";
}

/**
 * Get exercise parameters based on category, phase, age, and experience.
 *
 * This is the main function for the category-specific intensity system.
 * It calculates the appropriate sets, reps, rest, tempo, RPE, and 1RM%
 * based on the athlete's profile.
 *
 * @param categoryId - Sport category (1-4)
 * @param phase - Training phase (GPP, SPP, SSP)
 * @param ageGroup - Athlete's age group
 * @param yearsOfExperience - Years of training experience
 * @param exerciseFocus - Type of exercise (strength, power, bodyweight)
 * @returns Scaled parameters for the exercise
 */
export function getCategoryExerciseParameters(
  categoryId: CategoryId,
  phase: Phase,
  ageGroup: AgeGroup,
  yearsOfExperience: number,
  exerciseFocus: ExerciseFocus
): ScaledCategoryParameters {
  const config = CATEGORY_PHASE_CONFIG[categoryId][phase];
  const expBucket = getExperienceBucket(yearsOfExperience);
  const ageExpModifier = AGE_EXPERIENCE_MATRIX[ageGroup][expBucket];
  const safetyConstraints = AGE_SAFETY_CONSTRAINTS[ageGroup];

  // Determine which config values to use based on exercise focus
  const focusKey = exerciseFocus === "power" ? "power" : "strength";

  // Calculate sets from range using age+experience position
  let sets = getValueFromPosition(config.sets, ageExpModifier.setsPosition);

  // Apply age safety cap for 10-13
  if (safetyConstraints.maxSets !== null) {
    sets = Math.min(sets, safetyConstraints.maxSets);
  }

  // Calculate reps from range using age+experience position
  const repsRange = config.reps[focusKey];
  const reps = getValueFromPosition(repsRange, ageExpModifier.repsPosition);

  // Get rest seconds based on exercise focus
  const restSeconds = config.restSeconds[focusKey];

  // Calculate 1RM% range with age safety ceiling applied
  const oneRepMaxRange = config.oneRepMaxPercent[focusKey];
  const cappedOneRepMaxPercent: ParameterRange = {
    min: Math.min(oneRepMaxRange.min, safetyConstraints.oneRepMaxCeiling),
    max: Math.min(oneRepMaxRange.max, safetyConstraints.oneRepMaxCeiling),
  };

  return {
    oneRepMaxPercent: cappedOneRepMaxPercent,
    sets,
    reps,
    restSeconds,
    tempo: config.tempo,
    rpe: config.rpe,
  };
}

/**
 * Apply age safety constraints to calculated parameters.
 *
 * @param params - The calculated parameters
 * @param ageGroup - Athlete's age group
 * @returns Parameters with age safety constraints applied
 */
export function applyAgeSafetyConstraints(
  params: ScaledCategoryParameters,
  ageGroup: AgeGroup
): ScaledCategoryParameters {
  const constraints = AGE_SAFETY_CONSTRAINTS[ageGroup];

  return {
    ...params,
    sets: constraints.maxSets !== null ? Math.min(params.sets, constraints.maxSets) : params.sets,
    oneRepMaxPercent: {
      min: Math.min(params.oneRepMaxPercent.min, constraints.oneRepMaxCeiling),
      max: Math.min(params.oneRepMaxPercent.max, constraints.oneRepMaxCeiling),
    },
  };
}

/**
 * Get the appropriate bodyweight exercise variant based on phase and experience.
 *
 * @param baseExerciseSlug - The base exercise slug
 * @param phase - Training phase
 * @param experienceBucket - Experience bucket (0-1, 2-5, 6+)
 * @param progressions - Exercise progressions (easier/harder variants)
 * @returns The exercise slug to use
 */
export function getBodyweightVariant(
  baseExerciseSlug: string,
  phase: Phase,
  experienceBucket: ExperienceBucket,
  progressions?: ExerciseProgressions
): { slug: string; isSubstituted: boolean } {
  const variantType = BODYWEIGHT_VARIANT_MATRIX[phase][experienceBucket];

  switch (variantType) {
    case "easier":
      if (progressions?.easier) {
        return { slug: progressions.easier, isSubstituted: true };
      }
      break;
    case "harder":
      if (progressions?.harder) {
        return { slug: progressions.harder, isSubstituted: true };
      }
      break;
  }

  // Default to base exercise
  return { slug: baseExerciseSlug, isSubstituted: false };
}

/**
 * Format a tempo object to a string (e.g., "2.1.2" or "x.x.x").
 */
export function formatTempo(tempo: Tempo): string {
  const ecc = tempo.eccentric === "x" ? "x" : String(tempo.eccentric);
  const iso = tempo.isometric === "x" ? "x" : String(tempo.isometric);
  const con = tempo.concentric === "x" ? "x" : String(tempo.concentric);
  return `${ecc}.${iso}.${con}`;
}

/**
 * Get category name from category ID.
 */
export function getCategoryName(categoryId: CategoryId): string {
  const names: Record<CategoryId, string> = {
    1: "Endurance",
    2: "Power",
    3: "Rotational",
    4: "Strength",
  };
  return names[categoryId];
}

/**
 * Get sports for a category.
 */
export function getCategorySports(categoryId: CategoryId): string[] {
  const sports: Record<CategoryId, string[]> = {
    1: ["Soccer", "Hockey", "Lacrosse"],
    2: ["Basketball", "Volleyball"],
    3: ["Baseball", "Tennis", "Golf"],
    4: ["Wrestling", "Football"],
  };
  return sports[categoryId];
}
