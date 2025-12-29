/**
 * Library exports
 *
 * Pure utility functions extracted for testability and reuse.
 */

// Intake calculations
export { getSkillLevel, getTrainingPhase } from "./calculations";
export type { TrainingPhase } from "./calculations";

// Workout utilities
export { parseReps, isCardioExercise, CARDIO_TAGS } from "./workout";

// Drag reorder logic
export {
  computeOrderedExercises,
  computeOrderIndices,
  hasCustomOrder,
  moveExercise,
} from "./dragReorder";

// Auth state logic
export {
  computeAuthState,
  isTrainer,
  isAthlete,
  hasCompletedIntake,
} from "./authState";
export type { AuthInputState, ComputedAuthState } from "./authState";

// AuthGuard routing logic
export {
  getAuthGuardDecision,
  getIntakeRouteDecision,
  getPublicRouteDecision,
  DEFAULT_ROUTES,
} from "./authGuard";
export type {
  AuthState as AuthGuardState,
  AuthGuardOptions,
  RouteDecision,
} from "./authGuard";

// Schedule override logic
export {
  isSameSlot,
  isSamePhase,
  findSlotOverride,
  removeSlotOverrides,
  buildSwapOverrides,
  getOverridesForPhase,
  removePhaseOverrides,
  shouldClearTodayFocus,
  validateSwap,
  countOverridesByPhase,
} from "./scheduleOverride";
export type { WorkoutSlot, SlotOverride } from "./scheduleOverride";

// Intensity scaling
export {
  INTENSITY_CONFIG,
  BODYWEIGHT_INTENSITY_CONFIG,
  applyIntensityToWeighted,
  applyIntensityToBodyweight,
  parseRepsString,
  formatScaledValue,
  scaleRepsOrDuration,
  calculateOneRepMax,
  calculateTargetWeight,
  isBodyweightExercise,
} from "./intensityScaling";
export type {
  IntensityConfig,
  WeightedPrescription,
  ScaledWeightedPrescription,
  BodyweightPrescription,
  ExerciseProgressions,
  ScaledBodyweightPrescription,
} from "./intensityScaling";

