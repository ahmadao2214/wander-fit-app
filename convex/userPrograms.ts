import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { calculateWeeksPerPhase, DEFAULT_WEEKS_PER_PHASE } from "./weekMapping";

/**
 * User Programs - Active State Management
 * 
 * Manages where each user is in the training matrix:
 * - Handles intake completion and initial assignment
 * - Tracks progression through phases and weeks
 * - Provides workout lookup parameters
 * 
 * ARCHITECTURE DECISIONS (Confirmed by Co-founder):
 * 
 * 1. Workout Access Model: HYBRID
 *    - Athletes see ALL workouts for their training block (can browse/plan)
 *    - Can ONLY input data (sets, reps, weight, RPE) on SCHEDULED workout of day
 *    - Exception: injury reported → coach approval to modify (future feature)
 * 
 * 2. Phase Accessibility: SEQUENTIAL (Linear Progression)
 *    - Athletes access programming based on intake assignment
 *    - Must complete GPP before unlocking SPP
 *    - Must complete SPP before unlocking SSP
 * 
 * 3. Skill Level: AUTO-CALCULATED + MANUAL OVERRIDE + PROGRESSION
 *    - Initially calculated from intake assessment (yearsOfExperience)
 *    - Can be manually changed by athlete
 *    - Advances upon training block completion via re-assessment
 * 
 * 4. Rest Days: Clearly indicated with no structured exercise
 *    - Recommendations based on recent training: caloric surplus, foam rolling, 8+ sleep
 * 
 * 5. Program Reset: After 2+ weeks absence, restart from beginning
 *    - Pause/freeze feature available with coach approval (future)
 * 
 * 6. Progress Metrics:
 *    - Completion: individual days → weeks → training blocks (~4 weeks)
 *    - Coverage: unique exercises performed / total available
 *    - Consistency: average workouts per week, streaks
 * 
 * FUTURE: Re-assessment Intake
 * - After completing a training block, trigger re-assessment
 * - Example: "In intake you said you can hold plank for 2 min,
 *   now try around-the-worlds" → skill level advances
 */

// Shared validators
const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP")
);

const skillLevelValidator = v.union(
  v.literal("Novice"),
  v.literal("Moderate"),
  v.literal("Advanced")
);

const intakeTypeValidator = v.union(
  v.literal("initial"),
  v.literal("reassessment")
);

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get default training days based on days per week count
 * Used as fallback when selectedTrainingDays not provided (migration support)
 *
 * @param daysPerWeek - Number of training days (1-7)
 * @returns Array of day indices (0=Sun, 1=Mon, ..., 6=Sat)
 */
function getDefaultTrainingDays(daysPerWeek: number): number[] {
  // Common training patterns
  switch (daysPerWeek) {
    case 1:
      return [1]; // Monday
    case 2:
      return [1, 4]; // Mon, Thu
    case 3:
      return [1, 3, 5]; // Mon, Wed, Fri
    case 4:
      return [1, 2, 4, 5]; // Mon, Tue, Thu, Fri
    case 5:
      return [1, 2, 3, 4, 5]; // Mon-Fri
    case 6:
      return [1, 2, 3, 4, 5, 6]; // Mon-Sat
    case 7:
      return [0, 1, 2, 3, 4, 5, 6]; // Every day
    default:
      return [1, 3, 5]; // Default to Mon, Wed, Fri
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current user's program
 */
export const getCurrentUserProgram = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    return await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
  },
});

/**
 * Get user program by user ID
 */
export const getByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

/**
 * Get current program state (for workout lookup)
 * Returns the coordinates needed to fetch the scheduled workout template
 * Also includes today's focus override if set
 */
export const getCurrentProgramState = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.intakeCompletedAt) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    // Check for today's focus override
    const scheduleOverride = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get intake response for sport info
    const intake = await ctx.db.get(program.intakeResponseId);

    // Get sport name
    let sportName: string | null = null;
    if (intake?.sportId) {
      const sport = await ctx.db.get(intake.sportId);
      sportName = sport?.name ?? null;
    }

    // Get GPP category info
    let categoryName: string | null = null;
    let categoryShortName: string | null = null;
    const gppCategory = await ctx.db
      .query("gpp_categories")
      .withIndex("by_category_id", (q) => q.eq("categoryId", program.gppCategoryId))
      .first();
    if (gppCategory) {
      categoryName = gppCategory.name;
      categoryShortName = gppCategory.shortName;
    }

    return {
      gppCategoryId: program.gppCategoryId,
      phase: program.currentPhase,
      skillLevel: program.skillLevel,
      week: program.currentWeek,
      day: program.currentDay,
      programId: program._id,
      // Program duration
      totalProgramWeeks: program.totalProgramWeeks ?? null,
      weeksPerPhase: program.weeksPerPhase ?? null,
      // Sport and category info
      sportName,
      categoryName,
      categoryShortName,
      // Override info
      todayFocusTemplateId: scheduleOverride?.todayFocusTemplateId,
      hasTodayFocusOverride: !!scheduleOverride?.todayFocusTemplateId,
      hasSlotOverrides: (scheduleOverride?.slotOverrides?.length ?? 0) > 0,
    };
  },
});

/**
 * @deprecated Use getCurrentProgramState instead
 */
export const getWorkoutLookupParams = getCurrentProgramState;

/**
 * Get user's progress summary with all metrics
 * 
 * HYBRID MODEL: Shows scheduled workout + unlocked phases for browsing
 * PROGRESS METRICS: Completion (days/weeks/blocks), coverage, consistency
 */
export const getProgressSummary = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    // Get completed sessions
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .collect();

    const completedSessions = sessions.filter((s) => s.status === "completed");

    // Determine unlocked phases (Sequential Access)
    const unlockedPhases: ("GPP" | "SPP" | "SSP")[] = ["GPP"];
    if (program.sppUnlockedAt) unlockedPhases.push("SPP");
    if (program.sspUnlockedAt) unlockedPhases.push("SSP");

    // Calculate unique exercises performed
    const uniqueExerciseIds = new Set<string>();
    for (const session of completedSessions) {
      for (const exercise of session.exercises) {
        if (exercise.completed) {
          uniqueExerciseIds.add(exercise.exerciseId);
        }
      }
    }

    // Get progress metrics if available
    const progressRecord = await ctx.db
      .query("user_progress")
      .withIndex("by_program", (q) => q.eq("userProgramId", program._id))
      .first();

    // Get intake record for training days per week
    const intake = program.intakeResponseId
      ? await ctx.db.get(program.intakeResponseId)
      : null;
    const trainingDaysPerWeek = intake?.preferredTrainingDaysPerWeek ?? 3;

    // Calculate weeks and blocks completed
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;
    const weeksCompleted = Math.floor(completedSessions.length / trainingDaysPerWeek) || 0;
    const blocksCompleted = Math.floor(weeksCompleted / weeksPerPhase);

    return {
      // Scheduled workout pointer (HYBRID MODEL)
      scheduledPhase: program.currentPhase,
      scheduledWeek: program.currentWeek,
      scheduledDay: program.currentDay,
      
      // Phase access (SEQUENTIAL)
      unlockedPhases,
      
      // Assignment
      category: program.gppCategoryId,
      skillLevel: program.skillLevel,
      
      // Completion metrics
      daysCompleted: completedSessions.length,
      weeksCompleted,
      blocksCompleted,
      
      // Coverage metrics
      uniqueExercisesPerformed: uniqueExerciseIds.size,
      
      // Consistency (from progress record if available)
      averageWorkoutsPerWeek: progressRecord?.averageWorkoutsPerWeek ?? 0,
      currentStreak: progressRecord?.currentStreak ?? 0,
      longestStreak: progressRecord?.longestStreak ?? 0,
      
      // Pause status
      isPaused: !!program.pausedAt,
      pausedAt: program.pausedAt,
    };
  },
});

/**
 * Get unlocked phases for browse functionality (HYBRID MODEL)
 * Athletes can VIEW any workout within unlocked phases
 * Athletes can only INPUT data on scheduled workout
 */
export const getUnlockedPhases = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return { phases: ["GPP" as const], allUnlocked: false };

    const phases: ("GPP" | "SPP" | "SSP")[] = ["GPP"];
    if (program.sppUnlockedAt) phases.push("SPP");
    if (program.sspUnlockedAt) phases.push("SSP");

    return {
      phases,
      allUnlocked: phases.length === 3,
      sppUnlockedAt: program.sppUnlockedAt,
      sspUnlockedAt: program.sspUnlockedAt,
    };
  },
});

/**
 * Get user's intake history
 * Useful for tracking progression through re-assessments
 */
export const getIntakeHistory = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const intakes = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Sort by completedAt descending (most recent first)
    return intakes.sort((a, b) => b.completedAt - a.completedAt);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Complete intake and create user program
 * 
 * Creates:
 * 1. intake_responses record (preserved for history/re-assessment)
 * 2. user_programs record (active state)
 * 
 * Intake data is stored separately to:
 * - Preserve intake history even if program is reset
 * - Enable re-assessment intakes (multiple over time)
 * - Track how athletes progress through assessments
 */
export const completeIntake = mutation({
  args: {
    sportId: v.id("sports"),
    yearsOfExperience: v.number(),
    preferredTrainingDaysPerWeek: v.number(), // 1-7
    selectedTrainingDays: v.optional(v.array(v.number())), // [1, 3, 5] = Mon, Wed, Fri (0=Sun, 6=Sat)
    weeksUntilSeason: v.optional(v.number()),
    ageGroup: v.union(v.literal("14-17"), v.literal("18-35"), v.literal("36+")),
    intakeType: v.optional(intakeTypeValidator), // Defaults to "initial"
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    // Get sport to determine GPP category
    const sport = await ctx.db.get(args.sportId);
    if (!sport) {
      throw new Error("Invalid sport");
    }

    // Calculate skill level based on training experience
    let skillLevel: "Novice" | "Moderate" | "Advanced";
    if (args.yearsOfExperience < 1) {
      skillLevel = "Novice";
    } else if (args.yearsOfExperience < 3) {
      skillLevel = "Moderate";
    } else {
      skillLevel = "Advanced";
    }

    const now = Date.now();
    const intakeType = args.intakeType ?? "initial";

    // Generate default training days if not provided (based on count)
    // Common patterns: 3 days = Mon/Wed/Fri, 4 days = Mon/Tue/Thu/Fri, etc.
    const selectedTrainingDays = args.selectedTrainingDays ??
      getDefaultTrainingDays(args.preferredTrainingDaysPerWeek);

    // 1. Create intake_responses record (always created, preserved for history)
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: user._id,
      sportId: args.sportId,
      yearsOfExperience: args.yearsOfExperience,
      preferredTrainingDaysPerWeek: args.preferredTrainingDaysPerWeek,
      selectedTrainingDays,
      weeksUntilSeason: args.weeksUntilSeason,
      assignedGppCategoryId: sport.gppCategoryId,
      assignedSkillLevel: skillLevel,
      ageGroup: args.ageGroup,
      intakeType,
      completedAt: now,
    });

    // 2. Check if user already has a program
    const existingProgram = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    let programId;

    if (existingProgram && intakeType === "reassessment") {
      // Re-assessment: Update existing program with new skill level
      await ctx.db.patch(existingProgram._id, {
        intakeResponseId,
        skillLevel,
        updatedAt: now,
      });
      programId = existingProgram._id;
    } else if (!existingProgram) {
      // Calculate dynamic weeks per phase from intake
      // Uses weeksUntilSeason if provided, otherwise defaults to 12 weeks (standard 4 weeks per phase)
      const totalProgramWeeks = args.weeksUntilSeason ?? 12;
      const weeksPerPhase = calculateWeeksPerPhase(totalProgramWeeks);

      // Initial intake: Create new program
      programId = await ctx.db.insert("user_programs", {
        userId: user._id,
        intakeResponseId,
        gppCategoryId: sport.gppCategoryId,
        skillLevel,
        ageGroup: args.ageGroup,
        totalProgramWeeks,
        weeksPerPhase,
        currentPhase: "GPP",
        currentWeek: 1,
        currentDay: 1,
        phaseStartDate: now,
        createdAt: now,
        updatedAt: now,
      });

      // Update user to mark intake as complete
      await ctx.db.patch(user._id, {
        intakeCompletedAt: now,
      });
    } else {
      throw new Error("User already has a program. Use reassessment for updates.");
    }

    return {
      programId,
      intakeResponseId,
      gppCategoryId: sport.gppCategoryId,
      skillLevel,
      message: intakeType === "initial" 
        ? "Program created successfully" 
        : "Skill level updated via re-assessment",
    };
  },
});

/**
 * Advance to next workout day
 * Called after completing a workout session
 * 
 * HYBRID MODEL: This advances the "scheduled workout" pointer.
 * Athletes can still VIEW any workout in unlocked phases via browse.
 * 
 * SEQUENTIAL PHASES: When a phase completes (4 weeks done), the next
 * phase is unlocked. Athletes cannot access SPP until GPP is complete.
 */
export const advanceToNextDay = mutation({
  args: { programId: v.id("user_programs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || program.userId !== user._id) {
      throw new Error("Not authorized");
    }

    // Check if program is paused
    if (program.pausedAt) {
      throw new Error("Program is paused. Resume before continuing.");
    }

    const now = Date.now();
    let { currentDay, currentWeek, currentPhase } = program;

    // Advance day
    currentDay++;

    // Get preferred training days from linked intake
    const intake = program.intakeResponseId 
      ? await ctx.db.get(program.intakeResponseId)
      : null;
    const preferredDays = intake?.preferredTrainingDaysPerWeek ?? 4;

    // Check if we need to advance week
    if (currentDay > preferredDays) {
      currentDay = 1;
      currentWeek++;
    }

    // Check if we need to advance phase (dynamic weeks per phase)
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;
    if (currentWeek > weeksPerPhase) {
      // Phase is complete — set reassessment pending instead of advancing
      // The athlete must complete a reassessment before the next phase unlocks
      if (program.reassessmentPendingForPhase) {
        throw new Error("Reassessment already pending. Complete it before advancing.");
      }

      await ctx.db.patch(args.programId, {
        // Keep athlete at last position (don't advance to next phase)
        currentWeek: weeksPerPhase,
        currentDay: preferredDays,
        reassessmentPendingForPhase: currentPhase,
        lastWorkoutDate: now,
        updatedAt: now,
      });

      const phaseOrder: ("GPP" | "SPP" | "SSP")[] = ["GPP", "SPP", "SSP"];
      const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
      const isFullCycleComplete = currentPhaseIndex === phaseOrder.length - 1;

      return {
        advanced: true,
        currentPhase,
        currentWeek: weeksPerPhase,
        currentDay: preferredDays,
        phaseComplete: true,
        triggerReassessment: true,
        completedPhase: currentPhase,
        programComplete: isFullCycleComplete,
      };
    }

    // Normal day/week advancement
    await ctx.db.patch(args.programId, {
      currentDay,
      currentWeek,
      lastWorkoutDate: now,
      updatedAt: now,
    });

    return {
      advanced: true,
      currentPhase,
      currentDay,
      currentWeek,
      phaseComplete: false,
      programComplete: false,
    };
  },
});

/**
 * Pause program (for expected absence)
 * 
 * If pause exceeds 2 weeks, program should be reset on resume.
 * FUTURE: Require coach approval for pause
 */
export const pauseProgram = mutation({
  args: { 
    programId: v.id("user_programs"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || program.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const now = Date.now();

    await ctx.db.patch(args.programId, {
      pausedAt: now,
      pauseReason: args.reason,
      updatedAt: now,
    });

    return { success: true, pausedAt: now };
  },
});

/**
 * Resume program after pause
 * 
 * If pause exceeded 2 weeks, program is reset to beginning.
 * This follows co-founder guidance on extended absences.
 */
export const resumeProgram = mutation({
  args: { programId: v.id("user_programs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || program.userId !== user._id) {
      throw new Error("Not authorized");
    }

    if (!program.pausedAt) {
      throw new Error("Program is not paused");
    }

    const now = Date.now();
    const pauseDurationMs = now - program.pausedAt;
    const twoWeeksMs = 14 * 24 * 60 * 60 * 1000;

    // If paused for more than 2 weeks, reset to beginning
    const needsReset = pauseDurationMs > twoWeeksMs;

    if (needsReset) {
      await ctx.db.patch(args.programId, {
        currentPhase: "GPP",
        currentWeek: 1,
        currentDay: 1,
        phaseStartDate: now,
        pausedAt: undefined,
        pauseReason: undefined,
        // Reset phase unlocks
        sppUnlockedAt: undefined,
        sspUnlockedAt: undefined,
        updatedAt: now,
      });

      return { 
        success: true, 
        wasReset: true, 
        message: "Program reset due to 2+ week pause" 
      };
    }

    // Normal resume
    await ctx.db.patch(args.programId, {
      pausedAt: undefined,
      pauseReason: undefined,
      updatedAt: now,
    });

    return { success: true, wasReset: false };
  },
});

/**
 * Reset user program (start over from GPP Week 1 Day 1)
 * 
 * When this is needed (per co-founder):
 * - Unforeseen events: injury, unexpected travel
 * - If absence > 2 weeks, must restart from beginning
 */
export const resetProgram = mutation({
  args: { programId: v.id("user_programs") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || program.userId !== user._id) {
      throw new Error("Not authorized");
    }

    const now = Date.now();

    await ctx.db.patch(args.programId, {
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      lastWorkoutDate: undefined,
      pausedAt: undefined,
      pauseReason: undefined,
      // Reset phase unlocks
      sppUnlockedAt: undefined,
      sspUnlockedAt: undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Delete user program (for re-doing intake completely)
 */
export const deleteProgram = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (program) {
      await ctx.db.delete(program._id);
    }

    // Reset intake flag on user
    await ctx.db.patch(user._id, {
      intakeCompletedAt: undefined,
    });

    // Note: intake_responses are NOT deleted - preserved for history

    return { success: true };
  },
});

/**
 * Update skill level (manual adjustment)
 * 
 * CONFIRMED: Skill level is auto-calculated from intake, but can be manually changed.
 * 
 * FUTURE: After training block completion, trigger re-assessment intake
 * to evaluate if athlete is ready for next skill level.
 * Example flow: "In your initial intake, you held a plank for 2 min.
 * Try this around-the-world plank progression to assess advancement."
 */
export const updateSkillLevel = mutation({
  args: {
    programId: v.id("user_programs"),
    skillLevel: skillLevelValidator,
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const program = await ctx.db.get(args.programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || program.userId !== user._id) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.programId, {
      skillLevel: args.skillLevel,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// REASSESSMENT
// ─────────────────────────────────────────────────────────────────────────────

const phaseDifficultyValidator = v.union(
  v.literal("too_easy"),
  v.literal("just_right"),
  v.literal("challenging"),
  v.literal("too_hard")
);

const energyLevelValidator = v.union(
  v.literal("low"),
  v.literal("moderate"),
  v.literal("high")
);

/**
 * Helper to get the next phase in sequence
 */
function getNextPhase(phase: "GPP" | "SPP" | "SSP"): "GPP" | "SPP" | "SSP" {
  switch (phase) {
    case "GPP": return "SPP";
    case "SPP": return "SSP";
    case "SSP": return "GPP"; // Full cycle wraps
  }
}

/**
 * Get reassessment status for the current user
 * Returns whether a reassessment is pending, stats, and upgrade eligibility
 */
export const getReassessmentStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) return null;

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) return null;

    if (!program.reassessmentPendingForPhase) {
      return {
        reassessmentPending: false,
        pendingForPhase: null,
        completionStats: null,
        nextPhase: null,
        isFullCycleComplete: false,
        currentSkillLevel: program.skillLevel,
        canUpgradeSkillLevel: false,
        nextSkillLevel: null,
      };
    }

    const pendingPhase = program.reassessmentPendingForPhase;
    const nextPhase = getNextPhase(pendingPhase);
    const isFullCycleComplete = pendingPhase === "SSP";

    // Calculate completion stats
    const intake = await ctx.db.get(program.intakeResponseId);
    const preferredDays = intake?.preferredTrainingDaysPerWeek ?? 4;
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;
    const expectedWorkouts = weeksPerPhase * preferredDays;

    // Count completed sessions for this phase
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .collect();

    const phaseCompletedSessions = sessions.filter(
      (s) =>
        s.status === "completed" &&
        s.templateSnapshot?.phase === pendingPhase
    );

    const completedCount = phaseCompletedSessions.length;
    const completionRate = expectedWorkouts > 0
      ? Math.min(1, completedCount / expectedWorkouts)
      : 0;

    // Count completed reassessments for skill upgrade criteria
    const completedReassessments = [
      program.gppReassessmentCompletedAt,
      program.sppReassessmentCompletedAt,
      program.sspReassessmentCompletedAt,
    ].filter(Boolean).length;

    // Determine skill upgrade eligibility
    let canUpgradeSkillLevel = false;
    let nextSkillLevel: "Novice" | "Moderate" | "Advanced" | null = null;

    if (program.skillLevel === "Novice" && completionRate >= 0.75) {
      canUpgradeSkillLevel = true;
      nextSkillLevel = "Moderate";
    } else if (
      program.skillLevel === "Moderate" &&
      completionRate >= 0.80 &&
      completedReassessments >= 2
    ) {
      canUpgradeSkillLevel = true;
      nextSkillLevel = "Advanced";
    }

    return {
      reassessmentPending: true,
      pendingForPhase: pendingPhase,
      completionStats: {
        expected: expectedWorkouts,
        completed: completedCount,
        completionRate,
        weeksPerPhase,
      },
      nextPhase,
      isFullCycleComplete,
      currentSkillLevel: program.skillLevel,
      canUpgradeSkillLevel,
      nextSkillLevel,
      completedReassessments,
    };
  },
});

/**
 * Complete a reassessment after a phase
 * Advances to the next phase, optionally upgrades skill level
 */
export const completeReassessment = mutation({
  args: {
    phaseDifficulty: phaseDifficultyValidator,
    energyLevel: v.optional(energyLevelValidator),
    notes: v.optional(v.string()),
    maxesUpdated: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!program) {
      throw new Error("Program not found");
    }

    if (!program.reassessmentPendingForPhase) {
      throw new Error("No reassessment pending");
    }

    const completedPhase = program.reassessmentPendingForPhase;
    const nextPhase = getNextPhase(completedPhase);
    const isFullCycleComplete = completedPhase === "SSP";
    const now = Date.now();

    // Calculate completion stats for the intake record
    const intake = await ctx.db.get(program.intakeResponseId);
    const preferredDays = intake?.preferredTrainingDaysPerWeek ?? 4;
    const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;
    const expectedWorkouts = weeksPerPhase * preferredDays;

    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .collect();

    const phaseCompletedSessions = sessions.filter(
      (s) =>
        s.status === "completed" &&
        s.templateSnapshot?.phase === completedPhase
    );

    const completionRate = expectedWorkouts > 0
      ? Math.min(1, phaseCompletedSessions.length / expectedWorkouts)
      : 0;

    // Count already-completed reassessments
    const completedReassessments = [
      program.gppReassessmentCompletedAt,
      program.sppReassessmentCompletedAt,
      program.sspReassessmentCompletedAt,
    ].filter(Boolean).length;

    // Determine skill upgrade
    const previousSkillLevel = program.skillLevel;
    let newSkillLevel = previousSkillLevel;
    let skillLevelChanged = false;

    const isEasyOrRight = args.phaseDifficulty === "too_easy" || args.phaseDifficulty === "just_right";

    if (isEasyOrRight) {
      if (previousSkillLevel === "Novice" && completionRate >= 0.75) {
        newSkillLevel = "Moderate";
        skillLevelChanged = true;
      } else if (
        previousSkillLevel === "Moderate" &&
        completionRate >= 0.80 &&
        completedReassessments >= 2
      ) {
        newSkillLevel = "Advanced";
        skillLevelChanged = true;
      }
    }

    // Create intake_responses record for this reassessment
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: user._id,
      sportId: intake?.sportId ?? ("" as any), // Should always have intake
      yearsOfExperience: intake?.yearsOfExperience ?? 0,
      preferredTrainingDaysPerWeek: preferredDays,
      selectedTrainingDays: intake?.selectedTrainingDays,
      weeksUntilSeason: intake?.weeksUntilSeason,
      assignedGppCategoryId: program.gppCategoryId,
      assignedSkillLevel: newSkillLevel,
      ageGroup: intake?.ageGroup,
      intakeType: "reassessment",
      selfAssessment: {
        phaseDifficulty: args.phaseDifficulty,
        energyLevel: args.energyLevel,
        completionRate,
        notes: args.notes,
      },
      previousSkillLevel,
      skillLevelChanged,
      completedPhase,
      maxesUpdated: args.maxesUpdated,
      completedAt: now,
    });

    // Determine reassessment timestamp field
    const reassessmentTimestampField =
      completedPhase === "GPP" ? "gppReassessmentCompletedAt"
        : completedPhase === "SPP" ? "sppReassessmentCompletedAt"
          : "sspReassessmentCompletedAt";

    // Build program update
    const programUpdate: Record<string, any> = {
      intakeResponseId,
      currentPhase: nextPhase,
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      reassessmentPendingForPhase: undefined,
      [reassessmentTimestampField]: now,
      updatedAt: now,
    };

    // Unlock next phase (unless full cycle wrapping)
    if (!isFullCycleComplete) {
      const unlockField = completedPhase === "GPP" ? "sppUnlockedAt" : "sspUnlockedAt";
      programUpdate[unlockField] = now;
    } else {
      // Full cycle complete: reset to GPP, clear phase unlocks
      programUpdate.sppUnlockedAt = undefined;
      programUpdate.sspUnlockedAt = undefined;
    }

    // Upgrade skill level if applicable
    if (skillLevelChanged) {
      programUpdate.skillLevel = newSkillLevel;
    }

    await ctx.db.patch(program._id, programUpdate);

    return {
      skillLevelChanged,
      previousSkillLevel,
      newSkillLevel,
      nextPhase,
      isFullCycleComplete,
      completionRate,
    };
  },
});
