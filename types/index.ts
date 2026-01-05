import { Doc, Id } from "../convex/_generated/dataModel";

// ═══════════════════════════════════════════════════════════════════════════════
// GPP CORE TYPES (MVP)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GPP Category identifiers (1-4)
 * Maps to category names via gpp_categories table
 * 
 * 1: Continuous/Directional (Soccer, etc.)
 * 2: Explosive/Vertical (Basketball, etc.)
 * 3: Rotational/Unilateral (Baseball, etc.)
 * 4: General Strength (Football, Wrestling, etc.)
 */
export type GppCategoryId = 1 | 2 | 3 | 4;

/**
 * Training Phases - The periodization cycle
 * 
 * GPP = General Physical Preparedness
 *   - Foundation phase focusing on overall fitness, movement quality, work capacity
 *   - Typically 4 weeks, prepares athlete for sport-specific training
 *   - Focus: Build base strength, mobility, conditioning
 * 
 * SPP = Specific Physical Preparedness  
 *   - Sport-specific phase with movements that transfer to sport demands
 *   - Typically 4 weeks, bridges general fitness to competition readiness
 *   - Focus: Sport-specific strength, power development
 * 
 * SSP = Sport-Specific Preparedness (Competition/Peaking Phase)
 *   - Final preparation phase closest to competition
 *   - Typically 4 weeks, maintains fitness while reducing volume for freshness
 *   - Focus: Maintain gains, peak for competition, reduce fatigue
 */
export type Phase = "GPP" | "SPP" | "SSP";

/**
 * Full phase names for display purposes
 */
export const PHASE_NAMES: Record<Phase, string> = {
  GPP: "General Physical Preparedness",
  SPP: "Specific Physical Preparedness",
  SSP: "Sport-Specific Preparedness",
};

// Skill levels
export type SkillLevel = "Novice" | "Moderate" | "Advanced";

// Session status
export type SessionStatus = "in_progress" | "completed" | "abandoned";

// Intake types
export type IntakeType = "initial" | "reassessment";

// Intensity types
export type Intensity = "Low" | "Moderate" | "High";
export type OneRepMaxSource = "user_input" | "calculated" | "assessment";

// Document types from schema
export type Exercise = Doc<"exercises">;
export type Sport = Doc<"sports">;
export type GppCategory = Doc<"gpp_categories">;
export type ProgramTemplate = Doc<"program_templates">;
export type UserProgram = Doc<"user_programs">;
export type IntakeResponse = Doc<"intake_responses">;
export type GppWorkoutSession = Doc<"gpp_workout_sessions">;
export type UserProgress = Doc<"user_progress">;
export type UserMax = Doc<"user_maxes">;
export type UserOnboardingProgress = Doc<"user_onboarding_progress">;

// ─────────────────────────────────────────────────────────────────────────────
// Onboarding Education Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Onboarding screen identifiers
 * Order matches the flow: Welcome → Phase Education → Timeline → How It Works
 */
export type OnboardingScreenId =
  | "welcome"
  | "assessment-complete"
  | "what-to-expect"
  | "phase-gpp"
  | "phase-spp"
  | "phase-ssp"
  | "timeline"
  | "commitment"
  | "how-workouts-work"
  | "ready-to-start";

/**
 * Onboarding section identifiers
 */
export type OnboardingSectionId =
  | "welcome"
  | "phaseEducation"
  | "timeline"
  | "howItWorks";

/**
 * Onboarding progress state returned by the hook
 */
export interface OnboardingProgressState {
  hasStarted: boolean;
  currentScreen: number;
  currentScreenId: OnboardingScreenId;
  totalScreens: number;
  isCompleted: boolean;
  isSkipped: boolean;
  screensViewed: OnboardingScreenId[];
  progress: number; // 0-100 percentage
  completedAt?: number;
  skippedAt?: number;
  revisitCount?: number;
}

/**
 * Onboarding screen data for rendering
 */
export interface OnboardingScreenData {
  screenId: OnboardingScreenId;
  screenIndex: number;
  totalScreens: number;
  isFirst: boolean;
  isLast: boolean;
  // Personalized data
  userName: string;
  sport: string | null;
  category: {
    id: number;
    name: string;
    shortName: string;
    description: string;
  } | null;
  skillLevel: string | null;
  trainingDays: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPP Exercise Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

/**
 * Exercise prescription within a template
 */
export interface ExercisePrescription {
  exerciseId: Id<"exercises">;
  sets: number;
  reps: string; // "10-12", "5", "AMRAP", "30s"
  tempo?: string; // "3010", "X010"
  restSeconds: number; // Seconds between sets
  notes?: string;
  orderIndex: number;
  superset?: string; // "A", "B" for grouping
}

// ─────────────────────────────────────────────────────────────────────────────
// GPP Intake Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Intake form data - what the user enters
 * Note: This will be expanded in dedicated intake session
 */
export interface IntakeFormData {
  sportId: Id<"sports">;
  yearsOfExperience: number; // How many years of training
  preferredTrainingDaysPerWeek: number; // 1-7
  weeksUntilSeason?: number; // Optional: for planning phase duration
}

/**
 * Intake calculation result - what we derive from their answers
 */
export interface IntakeResult {
  gppCategoryId: GppCategoryId;
  skillLevel: SkillLevel;
  sportName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPP User Program Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Current program state - where the athlete is in their journey
 * (Renamed from WorkoutLookupParams for clarity)
 */
export interface CurrentProgramState {
  gppCategoryId: GppCategoryId;
  phase: Phase;
  skillLevel: SkillLevel;
  week: number; // 1-4
  day: number; // 1-7
}

/**
 * User's progress summary
 * 
 * Progress defined as:
 * - Completion: days → weeks → training blocks
 * - Coverage: unique exercises performed
 * - Consistency: average workouts per week
 */
export interface ProgressSummary {
  // Current position
  scheduledPhase: Phase;
  scheduledWeek: number;
  scheduledDay: number;
  
  // Phase access
  unlockedPhases: Phase[];
  
  // Assignment
  category: GppCategoryId;
  skillLevel: SkillLevel;
  
  // Completion metrics
  daysCompleted: number;
  weeksCompleted: number;
  blocksCompleted: number;
  
  // Coverage metrics
  uniqueExercisesPerformed: number;
  totalExercisesInCategory: number;
  exerciseCoveragePercent: number; // uniqueExercises / totalExercises * 100
  
  // Consistency
  averageWorkoutsPerWeek: number;
  currentStreak: number;
  longestStreak: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// GPP Session Execution Types
// ─────────────────────────────────────────────────────────────────────────────

export interface CompletedSet {
  repsCompleted?: number;
  durationSeconds?: number; // For timed exercises
  weight?: number; // Weight used
  rpe?: number; // Rating of Perceived Exertion (1-10)
  completed: boolean;
  skipped: boolean;
}

export interface CompletedExercise {
  exerciseId: Id<"exercises">;
  completed: boolean;
  skipped: boolean;
  notes?: string;
  sets: CompletedSet[];
}

export interface ExecutionState {
  currentExerciseIndex: number;
  currentSetIndex: number;
  isResting: boolean;
  workoutElapsedTimeSeconds: number;
  exerciseTimerSeconds: number;
  restTimerSeconds: number;
  completedExercises: CompletedExercise[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED/REUSABLE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

// User types
export type User = Doc<"users">;

export interface CreateUserInput {
  email: string;
  name: string;
  clerkId: string;
}

// Timer types (reusable for workout execution)
export type TimerType = "workout" | "exercise" | "rest";

export interface TimerState {
  workoutTimerSeconds: number;
  exerciseTimerSeconds: number;
  restTimerSeconds: number;
  isWorkoutActive: boolean;
  isExerciseActive: boolean;
  isRestActive: boolean;
}

export interface TimerActions {
  startWorkoutTimer: () => void;
  pauseWorkoutTimer: () => void;
  resetWorkoutTimer: () => void;
  startExerciseTimer: (durationSeconds: number) => void;
  pauseExerciseTimer: () => void;
  resetExerciseTimer: () => void;
  startRestTimer: (durationSeconds: number) => void;
  pauseRestTimer: () => void;
  resetRestTimer: () => void;
  pauseAllTimers: () => void;
  resetAllTimers: () => void;
}

export type TimerStore = TimerState & TimerActions;

// Navigation types
export interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

// Component prop types
export interface TimerDisplayProps {
  type: TimerType;
  seconds: number;
  isActive: boolean;
  onComplete?: () => void;
  size?: "small" | "medium" | "large";
}

export interface SetCounterProps {
  currentSet: number;
  totalSets: number;
  onComplete: (reps?: number) => void;
  onSkip: () => void;
  isRepBased: boolean;
  targetReps?: number;
}

export interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY TYPES (Kept for backward compatibility during migration)
// ═══════════════════════════════════════════════════════════════════════════════

/** @deprecated Use single athlete model */
export type UserRole = "trainer" | "client";

/** @deprecated Use ProgramTemplate instead */
export type Workout = Doc<"workouts">;

/** @deprecated Use GppWorkoutSession instead */
export type WorkoutSession = Doc<"workoutSessions">;

/** @deprecated Trainer relationships removed in GPP model */
export type TrainerClientRelationship = Doc<"trainerClientRelationships">;

/** @deprecated Use CurrentProgramState instead */
export type WorkoutLookupParams = CurrentProgramState;
