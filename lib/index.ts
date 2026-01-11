/**
 * Library exports
 *
 * Pure utility functions extracted for testability and reuse.
 */

// Intake calculations
export { getSkillLevel, getTrainingPhase } from "./calculations";
export type { TrainingPhase } from "./calculations";

// Intake UI utilities
export { getExperienceSliderColor, getSportInitials } from "./intakeUI";
export type { IntensityColorToken } from "./intakeUI";

// Workout utilities
export { parseReps, isCardioExercise, CARDIO_TAGS, mapIntensityToLevel } from "./workout";
export type { IntensityLevel, BackendIntensity } from "./workout";

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

// Week mapping utilities
export {
  calculateWeeksPerPhase,
  mapUserWeekToTemplateWeek,
  getWeekFocusLabel,
  getWeekVolumeMultiplier,
  generateWeekMapping,
  DEFAULT_WEEKS_PER_PHASE,
  MIN_WEEKS_PER_PHASE,
  MAX_WEEKS_PER_PHASE,
  NUMBER_OF_PHASES,
} from "./weekMapping";

// Intensity scaling (re-exported from convex/intensityScaling.ts - single source of truth)
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
  getAvgOneRepMaxPercent,
  getRpeTarget,
} from "./intensityScaling";
export type {
  Intensity,
  IntensityConfig,
  WeightedPrescription,
  ScaledWeightedPrescription,
  BodyweightPrescription,
  ExerciseProgressions,
  ScaledBodyweightPrescription,
} from "./intensityScaling";

