import { Doc, Id } from "convex/_generated/dataModel";

// User types
export type User = Doc<"users">;
export type UserRole = "trainer" | "client";

export interface CreateUserInput {
  email: string;
  name: string;
  role: UserRole;
  clerkId: string;
  trainerId?: Id<"users">;
}

// Workout types
export type Workout = Doc<"workouts">;
export type WorkoutSession = Doc<"workoutSessions">;
export type TrainerClientRelationship = Doc<"trainerClientRelationships">;

export interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps?: number;
  duration?: number; // seconds
  restDuration: number; // seconds
  orderIndex: number;
  notes?: string;
}

export interface CreateWorkoutInput {
  name: string;
  description?: string;
  clientId: Id<"users">;
  exercises: Omit<Exercise, 'id' | 'orderIndex'>[];
}

// Workout execution types
export interface CompletedSet {
  repsCompleted?: number;
  durationCompleted?: number;
  completed: boolean;
  skipped: boolean;
}

export interface CompletedExercise {
  exerciseId: string;
  completed: boolean;
  skipped: boolean;
  notes?: string;
  sets: CompletedSet[];
}

export interface ExecutionState {
  currentExerciseIndex: number;
  currentSetIndex: number;
  isResting: boolean;
  workoutElapsedTime: number; // seconds
  exerciseTimer: number; // for timed exercises
  restTimer: number;
  completedExercises: CompletedExercise[];
}

export interface CreateWorkoutSessionInput {
  workoutId: Id<"workouts">;
  clientId: Id<"users">;
  exercises: CompletedExercise[];
  totalDuration?: number;
  status: "completed" | "abandoned";
}

// Auth store types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
}

export interface AuthActions {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export type AuthStore = AuthState & AuthActions;

// Timer types
export type TimerType = 'workout' | 'exercise' | 'rest';

export interface TimerState {
  workoutTimer: number;
  exerciseTimer: number;
  restTimer: number;
  isWorkoutActive: boolean;
  isExerciseActive: boolean;
  isRestActive: boolean;
}

export interface TimerActions {
  startWorkoutTimer: () => void;
  pauseWorkoutTimer: () => void;
  resetWorkoutTimer: () => void;
  startExerciseTimer: (duration: number) => void;
  pauseExerciseTimer: () => void;
  resetExerciseTimer: () => void;
  startRestTimer: (duration: number) => void;
  pauseRestTimer: () => void;
  resetRestTimer: () => void;
  pauseAllTimers: () => void;
  resetAllTimers: () => void;
}

export type TimerStore = TimerState & TimerActions;

// Workout execution store types
export interface WorkoutExecutionState {
  currentWorkout: Workout | null;
  executionState: ExecutionState;
  isExecuting: boolean;
  isPaused: boolean;
}

export interface WorkoutExecutionActions {
  startWorkout: (workout: Workout) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  completeSet: (reps?: number, duration?: number) => void;
  skipSet: () => void;
  skipExercise: () => void;
  completeWorkout: () => Promise<void>;
  abandonWorkout: () => Promise<void>;
  resetExecution: () => void;
  nextExercise: () => void;
  startRest: () => void;
  endRest: () => void;
}

export type WorkoutExecutionStore = WorkoutExecutionState & WorkoutExecutionActions;

// Navigation types
export interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

// Component prop types
export interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  showClient?: boolean; // for trainer view
}

export interface ExerciseCardProps {
  exercise: Exercise;
  isActive?: boolean;
  onPress?: () => void;
}

export interface TimerDisplayProps {
  type: TimerType;
  seconds: number;
  isActive: boolean;
  onComplete?: () => void;
  size?: 'small' | 'medium' | 'large';
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

export interface SignUpForm {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  trainerId?: Id<"users">;
}

export interface CreateWorkoutForm {
  name: string;
  description: string;
  clientId: Id<"users">;
  exercises: {
    name: string;
    sets: number;
    reps?: number;
    duration?: number;
    restDuration: number;
    notes?: string;
  }[];
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
