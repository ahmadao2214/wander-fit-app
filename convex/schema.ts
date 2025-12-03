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
    // FUTURE: videoUrl, thumbnailUrl (with blob storage)
  })
    .index("by_slug", ["slug"]),

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

    // "Scheduled Workout" pointer
    currentPhase: phaseValidator, // The active phase
    currentWeek: v.number(), // 1-4 (within current phase)
    currentDay: v.number(), // Which day in the week (1-7)
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
