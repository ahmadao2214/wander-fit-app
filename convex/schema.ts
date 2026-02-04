import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED VALIDATORS
// ═══════════════════════════════════════════════════════════════════════════════

const skillLevelValidator = v.union(
  v.literal("Novice"),
  v.literal("Moderate"),
  v.literal("Advanced")
);

const ageGroupValidator = v.union(
  v.literal("10-13"),
  v.literal("14-17"),
  v.literal("18+")
);

/**
 * Phase Validator
 * 
 * GPP = General Physical Preparedness
 *   - Foundation phase focusing on overall fitness, movement quality, work capacity
 *   - Typically 4 weeks, prepares athlete for sport-specific training
 * 
 * SPP = Specific Physical Preparedness  
 *   - Sport-specific phase with movements that transfer to sport demands
 *   - Typically 4 weeks, bridges general fitness to competition readiness
 * 
 * SSP = Sport-Specific Preparedness (Competition/Peaking Phase)
 *   - Final preparation phase closest to competition
 *   - Typically 4 weeks, maintains fitness while reducing volume for freshness
 */
const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

const sessionStatusValidator = v.union(
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("abandoned")
);

const intensityValidator = v.union(
  v.literal("Low"),
  v.literal("Moderate"),
  v.literal("High")
);

const oneRepMaxSourceValidator = v.union(
  v.literal("user_input"),     // Athlete entered manually
  v.literal("calculated"),     // Derived from workout history
  v.literal("assessment")      // From dedicated assessment workout
);

// ═══════════════════════════════════════════════════════════════════════════════
// GPP TABLES (MVP)
// 
// ARCHITECTURE (Confirmed by Co-founder):
// 
// 1. Workout Access: HYBRID
//    - Athletes see ALL workouts for their training block
//    - Can ONLY input data (sets, reps, weight, RPE) on scheduled workout of day
//    - Browse for planning, execute on schedule
// 
// 2. Phase Access: SEQUENTIAL (Linear Progression)
//    - Athletes access programming based on intake assignment
//    - Must complete GPP → SPP → SSP in order
// 
// 3. Skill Level: AUTO + MANUAL + PROGRESSION
//    - Auto-calculated from intake assessment
//    - Manual override allowed
//    - Advances on training block completion (via re-assessment)
// 
// 4. Rest Days: Clearly indicated with no structured exercise
//    - May include recommendations: caloric surplus, foam rolling, 8+ hours sleep
// 
// 5. Program Reset: After 2+ weeks absence, restart from beginning
//    - Pause/freeze feature possible with coach approval
// 
// 6. Progress Metrics:
//    - Completion: individual days → weeks → training blocks
//    - Re-evaluation: strength endurance, cardio fitness, mobility, athleticism
// 
// ═══════════════════════════════════════════════════════════════════════════════

export default defineSchema({
  // ─────────────────────────────────────────────────────────────────────────────
  // REFERENCE DATA (Static, Seeded Once)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * exercises - Static exercise library
   * Contains all movements available in the program.
   * 
   * Tags can include: body part, movement pattern, warmup/cooldown suitability
   * Examples: ["lower_body", "squat", "bilateral", "warmup", "mobility"]
   */
  exercises: defineTable({
    name: v.string(),
    slug: v.string(), // e.g., "goblet_squat" - stable identifier for seeding
    instructions: v.optional(v.string()), // Markdown formatted
    tags: v.array(v.string()), // Flexible tagging system
    equipment: v.optional(v.array(v.string())), // ["dumbbell", "kettlebell"]
    difficulty: v.optional(v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    )),
    // Progressions for bodyweight intensity scaling
    // At Low intensity: use easier variant if available
    // At High intensity: use harder variant if available
    progressions: v.optional(v.object({
      easier: v.optional(v.string()), // Slug of easier variant
      harder: v.optional(v.string()), // Slug of harder variant
    })),
    // FUTURE: videoUrl, thumbnailUrl (with blob storage)
  })
    .index("by_slug", ["slug"]),

  /**
   * user_maxes - 1RM (One Rep Max) tracking for key lifts
   * 
   * Athletes need a way to establish their 1RM for key lifts to calculate intensity.
   * 
   * 1RM Capture Methods (in priority order):
   * 1. user_input - Athlete entered manually (they know their max)
   * 2. calculated - Derived from workout history (e.g., Epley formula: 1RM = weight × (1 + reps/30))
   * 3. assessment - From dedicated assessment workout
   * 
   * Key Lifts for 1RM Tracking:
   * - Back Squat
   * - Trap Bar Deadlift / Romanian Deadlift
   * - Bench Press / Dumbbell Bench Press
   * - Overhead Press
   */
  user_maxes: defineTable({
    userId: v.id("users"),
    exerciseId: v.id("exercises"),       // e.g., back_squat, bench_press, deadlift
    oneRepMax: v.number(),               // in lbs or kg (user preference)
    source: oneRepMaxSourceValidator,
    recordedAt: v.number(),              // timestamp
    notes: v.optional(v.string()),
  })
    .index("by_user", ["userId"])
    .index("by_user_exercise", ["userId", "exerciseId"]),

  /**
   * sports - Maps sports to GPP categories for intake flow
   * GPP Categories:
   *   1: Continuous/Directional (Soccer, Hockey, Lacrosse)
   *   2: Explosive/Vertical (Basketball, Volleyball)
   *   3: Rotational/Unilateral (Baseball, Tennis, Golf)
   *   4: General Strength (Wrestling, Football, General)
   * 
   * NOTE: MVP won't delve into sport positions (e.g., QB vs Linebacker).
   * All positions benefit from their sport's GPP category for general adaptations.
   */
  sports: defineTable({
    name: v.string(), // "Soccer", "Basketball", etc.
    gppCategoryId: v.number(), // 1-4
    description: v.optional(v.string()),
  })
    .index("by_category", ["gppCategoryId"])
    .index("by_name", ["name"]),

  /**
   * gpp_categories - Reference data for GPP category definitions
   * Provides metadata about each category's focus areas.
   */
  gpp_categories: defineTable({
    categoryId: v.number(), // 1-4
    name: v.string(), // "Continuous/Directional"
    shortName: v.string(), // "Endurance"
    description: v.string(),
    tags: v.array(v.string()), // Focus areas: ["high_rep", "single_leg", "rotational_core"]
  })
    .index("by_category_id", ["categoryId"]),

  // ─────────────────────────────────────────────────────────────────────────────
  // PROGRAM TEMPLATES (The Logic Engine)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * program_templates - The workout prescription matrix
   * 
   * Formula: 4 Categories × 3 Phases × 3 Skill Levels × 4 Weeks × 7 Days
   * (Rest days have no template - they are gaps in the schedule)
   * 
   * CONFIRMED: Athletes can VIEW all workouts but only INPUT on scheduled day.
   */
  program_templates: defineTable({
    // Matrix coordinates
    gppCategoryId: v.number(), // 1-4
    phase: phaseValidator, // "GPP", "SPP", "SSP"
    skillLevel: skillLevelValidator, // "Novice", "Moderate", "Advanced"
    week: v.number(), // 1-4 (within a phase)
    day: v.number(), // 1-7 (day of week)

    // Workout metadata
    name: v.string(), // e.g., "Lower Body Power"
    description: v.optional(v.string()),
    estimatedDurationMinutes: v.number(), // Duration in minutes

    /**
     * exercises - The workout prescription
     * Order determined by orderIndex. Warmup/cooldown indicated via notes.
     */
    exercises: v.array(v.object({
      exerciseId: v.id("exercises"),
      sets: v.number(),
      reps: v.string(), // "10-12", "5", "AMRAP", "30s", "2 min"
      tempo: v.optional(v.string()), // "3010", "X010" (X = explosive)
      restSeconds: v.number(), // Seconds between sets
      notes: v.optional(v.string()), // "Focus on depth", "Warmup pace"
      orderIndex: v.number(),
      superset: v.optional(v.string()), // Group ID for supersets: "A", "B"
      // Basketball program additions
      intensityPercent: v.optional(v.number()), // e.g., 65 for "65% of 1RM"
      section: v.optional(v.union(
        v.literal("warmup"),
        v.literal("main"),
        v.literal("circuit"),
        v.literal("finisher")
      )), // Workout section grouping
    })),
  })
    .index("by_assignment", ["gppCategoryId", "phase", "skillLevel", "week", "day"])
    .index("by_category_phase", ["gppCategoryId", "phase"]),

  // ─────────────────────────────────────────────────────────────────────────────
  // USER DATA
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * users - Core user record
   */
  users: defineTable({
    email: v.string(),
    name: v.string(),
    clerkId: v.string(), // from Clerk authentication
    createdAt: v.number(),

    // DEPRECATED: Will be removed after migration
    role: v.optional(v.union(v.literal("trainer"), v.literal("client"))),
    trainerId: v.optional(v.id("users")),

    // GPP intake tracking
    intakeCompletedAt: v.optional(v.number()), // null = needs intake flow

// Onboarding flow tracking (educational screens after intake)
    onboardingCompletedAt: v.optional(v.number()), // null = needs onboarding
    onboardingProgress: v.optional(v.number()), // Current screen index (0-9) for resume
    onboardingSkipped: v.optional(v.boolean()), // True if user skipped onboarding
  })
    .index("by_email", ["email"])
    .index("by_clerk", ["clerkId"])
    .index("by_trainer", ["trainerId"]),

  /**
   * intake_responses - Stores all intake questionnaire answers
   * 
   * Separated from user_programs to:
   * 1. Preserve intake history even if program is deleted/reset
   * 2. Enable re-assessment intakes (multiple intakes over time)
   * 3. Track how athletes progress through assessments
   * 
   * Each intake creates a new record; latest is used for current program.
   */
  intake_responses: defineTable({
    userId: v.id("users"),

    // Core intake questions
    sportId: v.id("sports"),
    yearsOfExperience: v.number(), // How many years of training
    preferredTrainingDaysPerWeek: v.number(), // 1-7
    selectedTrainingDays: v.optional(v.array(v.number())), // [1, 3, 5] = Mon, Wed, Fri (0=Sun, 6=Sat)

    // Age group - determines intensity ceiling
    ageGroup: v.optional(ageGroupValidator), // "10-13", "14-17", "18+" (optional for migration)
    dateOfBirth: v.optional(v.number()), // Timestamp for auto-calculation

    // Time-based intake (for planning)
    weeksUntilSeason: v.optional(v.number()), // How long until their season starts

    // Calculated results
    assignedGppCategoryId: v.number(), // Derived from sport
    assignedSkillLevel: skillLevelValidator, // Derived from experience + assessments

    // Assessment type
    intakeType: v.union(
      v.literal("initial"),      // First time intake
      v.literal("reassessment")  // After training block completion
    ),

    // Meta
    completedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_type", ["userId", "intakeType"]),

  /**
   * user_programs - Active program state for each athlete
   * Links to the most recent intake_response for assignment data.
   */
  user_programs: defineTable({
    userId: v.id("users"),
    intakeResponseId: v.id("intake_responses"), // Links to intake that created this

    // Assignment Results (from linked intake)
    gppCategoryId: v.number(), // 1-4
    skillLevel: skillLevelValidator, // "Novice", "Moderate", "Advanced"
    ageGroup: v.optional(ageGroupValidator), // "10-13", "14-17", "18+" - affects intensity ceiling (optional for migration)

    // Dynamic Program Duration (from intake weeksUntilSeason)
    totalProgramWeeks: v.optional(v.number()), // Total weeks from intake (weeksUntilSeason)
    weeksPerPhase: v.optional(v.number()), // Calculated: totalProgramWeeks / 3, min 2, max 8

    // "Scheduled Workout" pointer
    currentPhase: phaseValidator, // The active phase
    currentWeek: v.number(), // 1 to weeksPerPhase (within current phase)
    currentDay: v.number(), // Which day in the week (1 to trainingDaysPerWeek)
    lastWorkoutDate: v.optional(v.number()),

    // Phase Unlocking (Sequential Access)
    // GPP is always unlocked from start
    sppUnlockedAt: v.optional(v.number()), // Set when GPP completes
    sspUnlockedAt: v.optional(v.number()), // Set when SPP completes

    // Phase tracking
    phaseStartDate: v.number(),

    // Pause/Freeze (2+ weeks absence = restart)
    pausedAt: v.optional(v.number()),
    pauseReason: v.optional(v.string()),

    // Meta
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"]),

  // ─────────────────────────────────────────────────────────────────────────────
  // EXECUTION TRACKING
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * gpp_workout_sessions - Tracks workout execution against templates
   * 
   * Athletes can only create sessions for their SCHEDULED workout of the day
   * (unless injury exception approved by coach - future feature)
   */
  gpp_workout_sessions: defineTable({
    userId: v.id("users"),
    templateId: v.id("program_templates"),
    userProgramId: v.id("user_programs"),

    // Session timing (timestamps in milliseconds)
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalDurationSeconds: v.optional(v.number()), // Total workout time in seconds

    // Session state
    status: sessionStatusValidator,

    // Target intensity for this session (affects all prescription variables)
    // Defaults to "Moderate" if not specified
    targetIntensity: v.optional(intensityValidator),

    // Exercise completion tracking
    exercises: v.array(v.object({
      exerciseId: v.id("exercises"),
      completed: v.boolean(),
      skipped: v.boolean(),
      notes: v.optional(v.string()),
      sets: v.array(v.object({
        repsCompleted: v.optional(v.number()),
        durationSeconds: v.optional(v.number()), // For timed exercises
        weight: v.optional(v.number()), // Weight used (future: unit preference)
        rpe: v.optional(v.number()), // Rating of Perceived Exertion (1-10)
        completed: v.boolean(),
        skipped: v.boolean(),
      })),
    })),

    // Exercise order (indices into template.exercises array)
    // Allows athletes to reorder exercises during workout execution
    exerciseOrder: v.optional(v.array(v.number())),

    /**
     * templateSnapshot - Captures template state at time of workout
     * Preserves history even if template is later modified.
     */
    templateSnapshot: v.optional(v.object({
      name: v.string(),
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
      workoutDate: v.number(), // The actual date this workout was done
    })),

    /**
     * scalingSnapshot - Captures athlete profile at time of workout
     *
     * Used by category-specific intensity system to calculate exercise parameters.
     * Preserves the exact scaling context so historical workouts show
     * the same parameters even if athlete's profile changes.
     *
     * @see convex/intensityScaling.ts for getCategoryExerciseParameters()
     */
    scalingSnapshot: v.optional(v.object({
      categoryId: v.number(), // 1-4 (Endurance, Power, Rotational, Strength)
      phase: phaseValidator,  // GPP, SPP, SSP
      ageGroup: ageGroupValidator, // 10-13, 14-17, 18+
      yearsOfExperience: v.number(), // Used to determine experience bucket
    })),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"])
    .index("by_template", ["templateId"])
    .index("by_user_program", ["userProgramId"]),

  // ─────────────────────────────────────────────────────────────────────────────
  // PROGRESS TRACKING (New)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * user_progress - Aggregated progress metrics
   * 
   * Tracks:
   * - Unique exercises performed
   * - Consistency (workouts per week)
   * - Phase/block completion
   * - Exercise library coverage
   */
  user_progress: defineTable({
    userId: v.id("users"),
    userProgramId: v.id("user_programs"),
    
    // Completion metrics
    daysCompleted: v.number(), // Individual workout days
    weeksCompleted: v.number(), // Full weeks
    blocksCompleted: v.number(), // Training blocks (typically 4 weeks)
    
    // Exercise coverage
    uniqueExercisesPerformed: v.array(v.id("exercises")),
    totalExercisesInCategory: v.number(), // For calculating coverage %
    
    // Consistency
    averageWorkoutsPerWeek: v.number(),
    currentStreak: v.number(), // Consecutive scheduled workouts completed
    longestStreak: v.number(),
    
    // Last updated
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_program", ["userProgramId"]),

  // ─────────────────────────────────────────────────────────────────────────────
  // SCHEDULE OVERRIDES (User Customization)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * user_schedule_overrides - Stores user's schedule customizations
   * 
   * Allows athletes to:
   * 1. Set a different workout as "today's focus" (override scheduled workout)
   * 2. Swap/reorder workouts within a phase
   * 
   * DESIGN:
   * - One record per user program
   * - todayFocusTemplateId: temporary override for what to work on today
   * - slotOverrides: persistent swaps within phases (same phase only)
   */
  user_schedule_overrides: defineTable({
    userId: v.id("users"),
    userProgramId: v.id("user_programs"),
    
    // Today's workout focus (optional)
    // If set, this template is shown as "today's workout" instead of default
    todayFocusTemplateId: v.optional(v.id("program_templates")),
    todayFocusSetAt: v.optional(v.number()), // Timestamp when focus was set
    
    // Slot overrides within phases
    // Each entry maps a specific slot (phase/week/day) to a different template
    // Used for persistent swaps - when you swap A and B, both slots get entries
    slotOverrides: v.array(v.object({
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
      templateId: v.id("program_templates"), // The workout assigned to this slot
    })),
    
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_program", ["userProgramId"]),

  // ═══════════════════════════════════════════════════════════════════════════════
  // LEGACY TABLES (Kept for backward compatibility during migration)
  // ═══════════════════════════════════════════════════════════════════════════════

  /** @deprecated Use program_templates instead */
  workouts: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    exercises: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        sets: v.number(),
        reps: v.optional(v.number()),
        duration: v.optional(v.number()),
        restDuration: v.number(),
        orderIndex: v.number(),
        notes: v.optional(v.string()),
      })
    ),
    createdAt: v.number(),
    isActive: v.boolean(),
  })
    .index("by_client", ["clientId"])
    .index("by_trainer", ["trainerId"])
    .index("by_client_active", ["clientId", "isActive"]),

  /** @deprecated Use gpp_workout_sessions instead */
  workoutSessions: defineTable({
    workoutId: v.id("workouts"),
    clientId: v.id("users"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    totalDuration: v.optional(v.number()),
    status: sessionStatusValidator,
    exercises: v.array(
      v.object({
        exerciseId: v.string(),
        completed: v.boolean(),
        skipped: v.boolean(),
        notes: v.optional(v.string()),
        sets: v.array(
          v.object({
            repsCompleted: v.optional(v.number()),
            durationCompleted: v.optional(v.number()),
            completed: v.boolean(),
            skipped: v.boolean(),
          })
        ),
      })
    ),
  })
    .index("by_client", ["clientId"])
    .index("by_workout", ["workoutId"])
    .index("by_client_status", ["clientId", "status"]),

  /** @deprecated No longer needed in GPP model */
  trainerClientRelationships: defineTable({
    trainerId: v.id("users"),
    clientId: v.id("users"),
    status: v.union(
      v.literal("active"),
      v.literal("pending"),
      v.literal("inactive")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_trainer", ["trainerId"])
    .index("by_client", ["clientId"])
    .index("by_trainer_status", ["trainerId", "status"])
    .index("by_client_status", ["clientId", "status"]),

  /** @deprecated No longer needed in GPP model */
  clientInvitations: defineTable({
    email: v.string(),
    name: v.string(),
    trainerId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
  })
    .index("by_email", ["email"])
    .index("by_trainer", ["trainerId"])
    .index("by_status", ["status"])
    .index("by_email_status", ["email", "status"]),
});
