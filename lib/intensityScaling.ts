/**
 * Intensity Scaling Utilities
 *
 * This module re-exports from the single source of truth in convex/intensityScaling.ts
 * to provide a clean API for frontend code while avoiding code duplication.
 *
 * The actual implementation lives in convex/intensityScaling.ts, which is imported
 * by both this file (for frontend) and convex/programTemplates.ts (for backend queries).
 *
 * Intensity Levels:
 * - Low: Lighter load, fewer sets, longer rest, lower RPE
 * - Moderate: Baseline prescription from template
 * - High: Heavier load, more sets, fewer reps, shorter rest, higher RPE
 */

// Re-export everything from the single source of truth
export {
  // Types
  type Intensity,
  type IntensityConfig,
  type WeightedPrescription,
  type ScaledWeightedPrescription,
  type BodyweightPrescription,
  type ExerciseProgressions,
  type ScaledBodyweightPrescription,
  
  // Configuration constants
  INTENSITY_CONFIG,
  BODYWEIGHT_INTENSITY_CONFIG,
  
  // Reps/duration parsing
  parseRepsString,
  formatScaledValue,
  scaleRepsOrDuration,
  
  // Weighted exercise scaling
  applyIntensityToWeighted,
  
  // Bodyweight exercise scaling
  applyIntensityToBodyweight,
  
  // 1RM calculations
  calculateOneRepMax,
  calculateTargetWeight,
  
  // Exercise type detection
  isBodyweightExercise,
  
  // Utility functions
  getAvgOneRepMaxPercent,
  getRpeTarget,
} from "../convex/intensityScaling";
