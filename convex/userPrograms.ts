import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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

    return {
      gppCategoryId: program.gppCategoryId,
      phase: program.currentPhase,
      skillLevel: program.skillLevel,
      week: program.currentWeek,
      day: program.currentDay,
      programId: program._id,
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

    // Calculate weeks and blocks completed
    const weeksCompleted = Math.floor(completedSessions.length / program.currentDay) || 0;
    const blocksCompleted = Math.floor(weeksCompleted / 4);

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
    weeksUntilSeason: v.optional(v.number()),
    ageGroup: v.union(v.literal("10-13"), v.literal("14-17"), v.literal("18+")),
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

    // 1. Create intake_responses record (always created, preserved for history)
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: user._id,
      sportId: args.sportId,
      yearsOfExperience: args.yearsOfExperience,
      preferredTrainingDaysPerWeek: args.preferredTrainingDaysPerWeek,
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
      // Initial intake: Create new program
      programId = await ctx.db.insert("user_programs", {
        userId: user._id,
        intakeResponseId,
        gppCategoryId: sport.gppCategoryId,
        skillLevel,
        ageGroup: args.ageGroup,
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

    // Check if we need to advance phase (4 weeks per phase)
    if (currentWeek > 4) {
      const phaseOrder: ("GPP" | "SPP" | "SSP")[] = ["GPP", "SPP", "SSP"];
      const currentPhaseIndex = phaseOrder.indexOf(currentPhase);
      const isFullCycleComplete = currentPhaseIndex >= phaseOrder.length - 1;
      const nextPhase = isFullCycleComplete ? "GPP" : phaseOrder[currentPhaseIndex + 1];

      // ═══════════════════════════════════════════════════════════════════════════
      // REASSESSMENT REQUIRED
      // Instead of immediately advancing to next phase, set pending reassessment flag.
      // User must complete reassessment flow before continuing.
      // ═══════════════════════════════════════════════════════════════════════════

      await ctx.db.patch(args.programId, {
        // Keep user at last position (don't advance yet)
        currentWeek: 4,
        currentDay: preferredDays,
        lastWorkoutDate: now,
        // Set reassessment pending flag - this blocks further progression
        reassessmentPendingForPhase: currentPhase,
        updatedAt: now,
      });

      return {
        advanced: false, // Did NOT advance to next phase
        currentPhase,
        currentWeek: 4,
        currentDay: preferredDays,
        phaseComplete: true,
        programComplete: false,
        // Reassessment trigger info
        reassessmentRequired: true,
        completedPhase: currentPhase,
        nextPhase,
        isFullCycleComplete,
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
// REASSESSMENT FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current reassessment status
 *
 * Returns information about pending reassessment and data needed for the flow:
 * - Whether reassessment is pending
 * - Which phase was completed
 * - Completion stats from the phase
 * - Current maxes for re-testing
 * - Whether skill upgrade is possible
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

    const isPending = !!program.reassessmentPendingForPhase;

    // Get completion stats for the phase
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .collect();

    // Get linked intake for training days preference
    const intake = program.intakeResponseId
      ? await ctx.db.get(program.intakeResponseId)
      : null;
    const preferredDays = intake?.preferredTrainingDaysPerWeek ?? 4;

    // Calculate completion for current/pending phase
    const completedPhase = program.reassessmentPendingForPhase ?? program.currentPhase;
    const phaseSessions = sessions.filter(
      (s) => s.status === "completed" && s.templateSnapshot?.phase === completedPhase
    );

    // Expected workouts = 4 weeks × preferred days per week
    const expectedWorkouts = 4 * preferredDays;
    const completedWorkouts = phaseSessions.length;
    const completionRate = expectedWorkouts > 0
      ? Math.round((completedWorkouts / expectedWorkouts) * 100)
      : 0;

    // Determine if skill upgrade is possible
    const skillLevelOrder = ["Novice", "Moderate", "Advanced"] as const;
    const currentSkillIndex = skillLevelOrder.indexOf(program.skillLevel);
    const canUpgrade = currentSkillIndex < skillLevelOrder.length - 1;
    const nextSkillLevel = canUpgrade ? skillLevelOrder[currentSkillIndex + 1] : null;

    // Determine next phase
    const phaseOrder: ("GPP" | "SPP" | "SSP")[] = ["GPP", "SPP", "SSP"];
    const completedPhaseIndex = phaseOrder.indexOf(completedPhase);
    const isFullCycleComplete = completedPhaseIndex >= phaseOrder.length - 1;
    const nextPhase = isFullCycleComplete ? "GPP" : phaseOrder[completedPhaseIndex + 1];

    return {
      // Status
      reassessmentPending: isPending,
      pendingForPhase: program.reassessmentPendingForPhase ?? null,

      // Phase info
      completedPhase,
      nextPhase,
      isFullCycleComplete,

      // Completion stats
      completionStats: {
        completed: completedWorkouts,
        expected: expectedWorkouts,
        rate: completionRate,
      },

      // Skill level info
      currentSkillLevel: program.skillLevel,
      canUpgradeSkillLevel: canUpgrade,
      nextSkillLevel,

      // Program info for context
      programId: program._id,
      gppCategoryId: program.gppCategoryId,
      ageGroup: program.ageGroup,
    };
  },
});

/**
 * Complete reassessment flow
 *
 * Called when user finishes the reassessment screens.
 * Updates skill level if warranted, creates intake record, advances to next phase.
 */
export const completeReassessment = mutation({
  args: {
    // Self-assessment data
    phaseDifficulty: v.union(
      v.literal("too_easy"),
      v.literal("just_right"),
      v.literal("challenging"),
      v.literal("too_hard")
    ),
    energyLevel: v.optional(v.union(
      v.literal("low"),
      v.literal("moderate"),
      v.literal("high")
    )),
    notes: v.optional(v.string()),

    // Whether maxes were updated (done separately via setMultipleMaxes)
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

    const now = Date.now();
    const completedPhase = program.reassessmentPendingForPhase;
    const previousSkillLevel = program.skillLevel;

    // Get completion stats for skill upgrade calculation
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .collect();

    const intake = program.intakeResponseId
      ? await ctx.db.get(program.intakeResponseId)
      : null;
    const preferredDays = intake?.preferredTrainingDaysPerWeek ?? 4;

    const phaseSessions = sessions.filter(
      (s) => s.status === "completed" && s.templateSnapshot?.phase === completedPhase
    );
    const expectedWorkouts = 4 * preferredDays;
    const completedWorkouts = phaseSessions.length;
    const completionRate = expectedWorkouts > 0
      ? Math.round((completedWorkouts / expectedWorkouts) * 100)
      : 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // SKILL LEVEL UPGRADE LOGIC
    // ═══════════════════════════════════════════════════════════════════════════
    // Criteria:
    // - Novice → Moderate: "too_easy" or "just_right" + 75%+ completion
    // - Moderate → Advanced: "too_easy" or "just_right" + 80%+ completion
    // ═══════════════════════════════════════════════════════════════════════════

    let newSkillLevel = previousSkillLevel;
    let skillLevelChanged = false;

    const difficultyAllowsUpgrade =
      args.phaseDifficulty === "too_easy" || args.phaseDifficulty === "just_right";

    if (difficultyAllowsUpgrade) {
      if (previousSkillLevel === "Novice" && completionRate >= 75) {
        newSkillLevel = "Moderate";
        skillLevelChanged = true;
      } else if (previousSkillLevel === "Moderate" && completionRate >= 80) {
        newSkillLevel = "Advanced";
        skillLevelChanged = true;
      }
    }

    // Determine next phase
    const phaseOrder: ("GPP" | "SPP" | "SSP")[] = ["GPP", "SPP", "SSP"];
    const completedPhaseIndex = phaseOrder.indexOf(completedPhase);
    const isFullCycleComplete = completedPhaseIndex >= phaseOrder.length - 1;
    const nextPhase = isFullCycleComplete ? "GPP" : phaseOrder[completedPhaseIndex + 1];

    // Create intake_responses record for this reassessment
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: user._id,
      sportId: intake?.sportId ?? ("" as any), // Keep same sport
      yearsOfExperience: intake?.yearsOfExperience ?? 0,
      preferredTrainingDaysPerWeek: preferredDays,
      ageGroup: program.ageGroup,
      weeksUntilSeason: intake?.weeksUntilSeason,
      assignedGppCategoryId: program.gppCategoryId,
      assignedSkillLevel: newSkillLevel,
      intakeType: "reassessment",
      // Reassessment-specific fields
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

    // Determine reassessment completion timestamp field
    const reassessmentTimestampField =
      completedPhase === "GPP" ? "gppReassessmentCompletedAt" :
      completedPhase === "SPP" ? "sppReassessmentCompletedAt" :
      "sspReassessmentCompletedAt";

    // Determine unlock field for next phase
    const unlockField =
      completedPhase === "GPP" ? "sppUnlockedAt" :
      completedPhase === "SPP" ? "sspUnlockedAt" :
      null; // SSP doesn't unlock anything new

    // Build update object
    const programUpdate: Record<string, any> = {
      intakeResponseId, // Link to new intake
      skillLevel: newSkillLevel,
      currentPhase: nextPhase,
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      reassessmentPendingForPhase: undefined, // Clear pending flag
      [reassessmentTimestampField]: now,
      updatedAt: now,
    };

    // Set unlock timestamp if advancing to new phase (not full cycle reset)
    if (unlockField && !isFullCycleComplete) {
      programUpdate[unlockField] = now;
    }

    // If full cycle complete, reset phase unlocks for new cycle
    if (isFullCycleComplete) {
      programUpdate.sppUnlockedAt = undefined;
      programUpdate.sspUnlockedAt = undefined;
    }

    await ctx.db.patch(program._id, programUpdate);

    return {
      success: true,
      // Phase transition info
      completedPhase,
      nextPhase,
      isFullCycleComplete,
      // Skill level info
      previousSkillLevel,
      newSkillLevel,
      skillLevelChanged,
      // Stats
      completionRate,
      intakeResponseId,
    };
  },
});

/**
 * Trigger manual reassessment from settings
 *
 * Allows user to retake assessment without completing a phase.
 * Sets pending flag for current phase.
 */
export const triggerManualReassessment = mutation({
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

    if (!program) {
      throw new Error("Program not found");
    }

    if (program.reassessmentPendingForPhase) {
      throw new Error("Reassessment already pending");
    }

    const now = Date.now();

    await ctx.db.patch(program._id, {
      reassessmentPendingForPhase: program.currentPhase,
      updatedAt: now,
    });

    return {
      success: true,
      pendingForPhase: program.currentPhase,
    };
  },
});
