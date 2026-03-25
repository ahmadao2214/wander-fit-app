import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Temporary debug query to find users by email pattern
export const searchUsersByEmail = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    // Return all users for now, we'll filter client-side
    return allUsers.map(u => ({
      _id: u._id,
      email: u.email,
      name: u.name,
      clerkId: u.clerkId,
      createdAt: u.createdAt,
      intakeCompletedAt: u.intakeCompletedAt,
      onboardingCompletedAt: u.onboardingCompletedAt,
      onboardingProgress: u.onboardingProgress,
    }));
  },
});

// Create user for testing/debugging (admin only)
export const createUserForClerkId = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (existingUser) {
      return { error: "User already exists", user: existingUser };
    }

    // Create the user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      clerkId: args.clerkId,
      role: "client",
      createdAt: Date.now(),
    });

    const user = await ctx.db.get(userId);
    return { success: true, user };
  },
});

// Search users by email pattern
export const searchUsersByPattern = query({
  args: { pattern: v.string() },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    const matched = allUsers.filter(u =>
      u.email.toLowerCase().includes(args.pattern.toLowerCase()) ||
      u.name.toLowerCase().includes(args.pattern.toLowerCase())
    );

    const results = [];
    for (const user of matched) {
      const intakes = await ctx.db
        .query("intake_responses")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      const programs = await ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect();

      results.push({
        user,
        intakes,
        programs,
      });
    }

    return results;
  },
});

// Get all data for a specific user
export const getUserData = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    // Find user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) {
      return { error: "User not found" };
    }

    // Get intake_responses
    const intakeResponses = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user_programs
    const userPrograms = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get user_maxes
    const userMaxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get sports for context
    const sports = await ctx.db.query("sports").collect();

    return {
      user,
      intakeResponses,
      userPrograms,
      userMaxes,
      sports,
    };
  },
});

// Look up a user directly by document ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return { error: "User not found" };

    const programs = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return { user, programs };
  },
});

// Inspect sessions and overrides for a user (migration debugging)
export const inspectUserSessions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const programId = (await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first())?._id;

    // Get in-progress sessions
    const inProgressSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "in_progress"))
      .collect();

    // For each in-progress session, check if templateId still resolves
    const sessionDetails = [];
    for (const session of inProgressSessions) {
      const template = await ctx.db.get(session.templateId);
      sessionDetails.push({
        sessionId: session._id,
        templateId: session.templateId,
        templateExists: !!template,
        templateName: template?.name ?? null,
        snapshotName: session.templateSnapshot?.name ?? null,
        status: session.status,
      });
    }

    // Get schedule overrides
    let overrides = null;
    if (programId) {
      overrides = await ctx.db
        .query("user_schedule_overrides")
        .withIndex("by_user_program", (q) => q.eq("userProgramId", programId))
        .first();
    }

    // Check if any override templateIds are stale
    let overrideDetails = null;
    if (overrides) {
      const focusTemplate = overrides.todayFocusTemplateId
        ? await ctx.db.get(overrides.todayFocusTemplateId)
        : null;

      const slotDetails = [];
      for (const slot of overrides.slotOverrides) {
        const t = await ctx.db.get(slot.templateId);
        slotDetails.push({
          ...slot,
          templateExists: !!t,
          templateName: t?.name ?? null,
        });
      }

      overrideDetails = {
        todayFocusTemplateId: overrides.todayFocusTemplateId,
        todayFocusExists: !!focusTemplate,
        todayFocusName: focusTemplate?.name ?? null,
        slotOverrides: slotDetails,
      };
    }

    // Get completed sessions
    const completedSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    const completedDetails = completedSessions.map((s) => ({
      sessionId: s._id,
      templateId: s.templateId,
      snapshotName: s.templateSnapshot?.name ?? null,
      snapshotDay: s.templateSnapshot?.day ?? null,
      snapshotWeek: s.templateSnapshot?.week ?? null,
      status: s.status,
    }));

    return {
      inProgressSessions: sessionDetails,
      completedSessions: completedDetails,
      overrides: overrideDetails,
    };
  },
});

// Fix user's intake/onboarding state
export const fixUserOnboardingState = mutation({
  args: {
    userId: v.id("users"),
    action: v.union(
      v.literal("complete_onboarding"),
      v.literal("reset_intake")
    )
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const now = Date.now();

    if (args.action === "complete_onboarding") {
      await ctx.db.patch(args.userId, {
        onboardingCompletedAt: now,
        onboardingProgress: 9,
      });
      return { success: true, action: "completed_onboarding" };
    }

    if (args.action === "reset_intake") {
      // Clear user's intake/onboarding flags
      await ctx.db.patch(args.userId, {
        intakeCompletedAt: undefined,
        onboardingCompletedAt: undefined,
        onboardingProgress: undefined,
      });

      // Delete their program if exists
      const program = await ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first();
      if (program) {
        await ctx.db.delete(program._id);
      }

      // Note: intake_responses are preserved for history

      return { success: true, action: "reset_intake", programDeleted: !!program };
    }

    return { success: false, error: "Unknown action" };
  },
});

/**
 * Setup a user for testing the reassessment flow.
 *
 * Positions the user at the LAST workout of GPP phase so that completing
 * one more workout triggers the reassessment prompt.
 *
 * Creates:
 * 1. intake_response (Basketball, Novice, 3 days/week)
 * 2. user_programs at GPP week 4, day 3 (last workout)
 * 3. Completed workout sessions for history (so completion rate > 75%)
 * 4. user_maxes for core lifts
 * 5. Marks user's intake + onboarding as complete
 *
 * Usage: npx convex run debug:setupReassessmentTest '{"userEmail": "sebianmagrow@icloud.com"}'
 */
export const setupReassessmentTest = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // 1. Find the user
    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find(
      (u) => u.email.toLowerCase() === args.userEmail.toLowerCase()
    );
    if (!user) {
      throw new Error(`User not found with email: ${args.userEmail}`);
    }

    // 2. Clean up existing data for this user
    const existingPrograms = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of existingPrograms) {
      // Delete associated sessions
      const sessions = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_program", (q) => q.eq("userProgramId", p._id))
        .collect();
      for (const s of sessions) {
        await ctx.db.delete(s._id);
      }
      // Delete associated progress
      const progress = await ctx.db
        .query("user_progress")
        .withIndex("by_program", (q) => q.eq("userProgramId", p._id))
        .collect();
      for (const pr of progress) {
        await ctx.db.delete(pr._id);
      }
      // Delete associated schedule overrides
      const overrides = await ctx.db
        .query("user_schedule_overrides")
        .withIndex("by_user_program", (q) => q.eq("userProgramId", p._id))
        .collect();
      for (const o of overrides) {
        await ctx.db.delete(o._id);
      }
      await ctx.db.delete(p._id);
    }

    // Delete existing maxes
    const existingMaxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const m of existingMaxes) {
      await ctx.db.delete(m._id);
    }

    // 3. Find Basketball sport (Category 2: Explosive/Vertical)
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", "Basketball"))
      .first();
    if (!sport) {
      throw new Error("Basketball sport not found. Run seed first.");
    }

    // 4. Create intake_response
    const preferredDays = 3;
    const weeksPerPhase = 4;
    const totalProgramWeeks = 12;

    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: user._id,
      sportId: sport._id,
      yearsOfExperience: 0.5, // < 1 year → Novice
      preferredTrainingDaysPerWeek: preferredDays,
      selectedTrainingDays: [1, 3, 5], // Mon, Wed, Fri
      weeksUntilSeason: totalProgramWeeks,
      assignedGppCategoryId: sport.gppCategoryId,
      assignedSkillLevel: "Novice",
      ageGroup: "18-35",
      intakeType: "initial",
      completedAt: now - 28 * DAY_MS, // 4 weeks ago
    });

    // 5. Create user_programs positioned at GPP week 4, day 3 (last workout of phase)
    const programId = await ctx.db.insert("user_programs", {
      userId: user._id,
      intakeResponseId,
      gppCategoryId: sport.gppCategoryId,
      skillLevel: "Novice",
      ageGroup: "18-35",
      totalProgramWeeks,
      weeksPerPhase,
      currentPhase: "GPP",
      currentWeek: weeksPerPhase, // Week 4 (last week)
      currentDay: preferredDays, // Day 3 (last day of week)
      phaseStartDate: now - 28 * DAY_MS,
      lastWorkoutDate: now - 2 * DAY_MS,
      createdAt: now - 28 * DAY_MS,
      updatedAt: now - 2 * DAY_MS,
    });

    // 6. Create completed workout sessions for weeks 1-4
    // We'll create sessions for all previous workouts (11 of 12 = 91.7% completion)
    const sessionsCreated: string[] = [];
    for (let week = 1; week <= weeksPerPhase; week++) {
      const maxDay = week === weeksPerPhase ? preferredDays - 1 : preferredDays;
      for (let day = 1; day <= maxDay; day++) {
        // Look up the template for this workout
        const template = await ctx.db
          .query("program_templates")
          .withIndex("by_assignment", (q) =>
            q
              .eq("gppCategoryId", sport.gppCategoryId)
              .eq("phase", "GPP")
              .eq("skillLevel", "Novice")
              .eq("week", week)
              .eq("day", day)
          )
          .first();

        if (!template) continue;

        const workoutDate = now - ((weeksPerPhase - week) * 7 + (preferredDays - day) + 1) * DAY_MS;

        // Create a completed session with all exercises marked done
        const sessionExercises = template.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          completed: true,
          skipped: false,
          sets: Array.from({ length: ex.sets }, () => ({
            repsCompleted: 10,
            weight: 50,
            rpe: 7,
            completed: true,
            skipped: false,
          })),
        }));

        await ctx.db.insert("gpp_workout_sessions", {
          userId: user._id,
          templateId: template._id,
          userProgramId: programId as Id<"user_programs">,
          startedAt: workoutDate,
          completedAt: workoutDate + 45 * 60 * 1000, // 45 min workout
          totalDurationSeconds: 45 * 60,
          status: "completed",
          exercises: sessionExercises,
          templateSnapshot: {
            name: template.name,
            phase: "GPP",
            week,
            day,
            workoutDate,
          },
          scalingSnapshot: {
            categoryId: sport.gppCategoryId,
            phase: "GPP",
            ageGroup: "18-35",
            yearsOfExperience: 0.5,
          },
        });
        sessionsCreated.push(`W${week}D${day}: ${template.name}`);
      }
    }

    // 7. Create user_maxes for core lifts
    const coreLiftSlugs = ["back_squat", "bench_press", "trap_bar_deadlift"];
    const coreMaxes: Record<string, number> = {
      back_squat: 185,
      bench_press: 135,
      trap_bar_deadlift: 225,
    };

    for (const slug of coreLiftSlugs) {
      const exercise = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (exercise) {
        await ctx.db.insert("user_maxes", {
          userId: user._id,
          exerciseId: exercise._id,
          oneRepMax: coreMaxes[slug],
          source: "user_input",
          recordedAt: now - 28 * DAY_MS,
        });
      }
    }

    // 8. Mark user's intake and onboarding as complete
    await ctx.db.patch(user._id, {
      intakeCompletedAt: now - 28 * DAY_MS,
      onboardingCompletedAt: now - 28 * DAY_MS,
      onboardingProgress: 9,
    });

    return {
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      program: {
        id: programId,
        position: `GPP Week ${weeksPerPhase}, Day ${preferredDays} (LAST workout of phase)`,
        skillLevel: "Novice",
        category: `${sport.gppCategoryId} (${sport.name})`,
        weeksPerPhase,
      },
      sessionsCreated: sessionsCreated.length,
      sessions: sessionsCreated,
      maxes: coreMaxes,
      instructions: [
        "1. Greg logs in with sebianmagrow@icloud.com",
        "2. He'll see his scheduled workout (GPP Week 4, Day 3 - last workout)",
        "3. He starts and completes the workout",
        "4. After completion, the reassessment prompt appears",
        "5. He can dismiss it → dashboard shows 'Phase Assessment Ready' banner",
        "6. Clicking banner (or starting check-in) → 4-screen flow:",
        "   - Celebration → Self-Assessment → Maxes → Results",
        "7. With Novice + 91.7% completion + easy/just_right → skill upgrades to Moderate",
        "8. GPP completes, SPP unlocks",
      ],
    };
  },
});

/**
 * Set up reassessment-blocked state: positions user as if they just completed
 * the last workout and the reassessment is pending (not yet completed).
 * Next-phase workouts should be blocked until reassessment is done.
 *
 * Usage: npx convex run debug:setupReassessmentBlocked '{"userEmail": "sebianmagrow@icloud.com"}' --prod
 */
export const setupReassessmentBlocked = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, args) => {
    // First run the same setup as setupReassessmentTest by reusing its logic inline
    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    // 1. Find the user
    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find(
      (u) => u.email.toLowerCase() === args.userEmail.toLowerCase()
    );
    if (!user) {
      throw new Error(`User not found with email: ${args.userEmail}`);
    }

    // 2. Clean up existing data
    const existingPrograms = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const p of existingPrograms) {
      const sessions = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_program", (q) => q.eq("userProgramId", p._id))
        .collect();
      for (const s of sessions) {
        await ctx.db.delete(s._id);
      }
      const progress = await ctx.db
        .query("user_progress")
        .withIndex("by_program", (q) => q.eq("userProgramId", p._id))
        .collect();
      for (const pr of progress) {
        await ctx.db.delete(pr._id);
      }
      const overrides = await ctx.db
        .query("user_schedule_overrides")
        .withIndex("by_user_program", (q) => q.eq("userProgramId", p._id))
        .collect();
      for (const o of overrides) {
        await ctx.db.delete(o._id);
      }
      await ctx.db.delete(p._id);
    }

    const existingMaxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    for (const m of existingMaxes) {
      await ctx.db.delete(m._id);
    }

    // 3. Find Basketball sport
    const sport = await ctx.db
      .query("sports")
      .withIndex("by_name", (q) => q.eq("name", "Basketball"))
      .first();
    if (!sport) {
      throw new Error("Basketball sport not found. Run seed first.");
    }

    // 4. Create intake_response
    const preferredDays = 3;
    const weeksPerPhase = 4;
    const totalProgramWeeks = 12;

    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId: user._id,
      sportId: sport._id,
      yearsOfExperience: 0.5,
      preferredTrainingDaysPerWeek: preferredDays,
      selectedTrainingDays: [1, 3, 5],
      weeksUntilSeason: totalProgramWeeks,
      assignedGppCategoryId: sport.gppCategoryId,
      assignedSkillLevel: "Novice",
      ageGroup: "18-35",
      intakeType: "initial",
      completedAt: now - 28 * DAY_MS,
    });

    // 5. Create program WITH reassessmentPendingForPhase set
    // Position past the last workout (phase complete, awaiting reassessment)
    const programId = await ctx.db.insert("user_programs", {
      userId: user._id,
      intakeResponseId,
      gppCategoryId: sport.gppCategoryId,
      skillLevel: "Novice",
      ageGroup: "18-35",
      totalProgramWeeks,
      weeksPerPhase,
      currentPhase: "GPP",
      currentWeek: weeksPerPhase,
      currentDay: preferredDays,
      phaseStartDate: now - 28 * DAY_MS,
      lastWorkoutDate: now - 1 * DAY_MS,
      createdAt: now - 28 * DAY_MS,
      updatedAt: now - 1 * DAY_MS,
      reassessmentPendingForPhase: "GPP",
    });

    // 6. Create ALL 12 completed sessions (100% completion)
    const sessionsCreated: string[] = [];
    for (let week = 1; week <= weeksPerPhase; week++) {
      for (let day = 1; day <= preferredDays; day++) {
        const template = await ctx.db
          .query("program_templates")
          .withIndex("by_assignment", (q) =>
            q
              .eq("gppCategoryId", sport.gppCategoryId)
              .eq("phase", "GPP")
              .eq("skillLevel", "Novice")
              .eq("week", week)
              .eq("day", day)
          )
          .first();

        if (!template) continue;

        const workoutDate = now - ((weeksPerPhase - week) * 7 + (preferredDays - day) + 1) * DAY_MS;

        const sessionExercises = template.exercises.map((ex) => ({
          exerciseId: ex.exerciseId,
          completed: true,
          skipped: false,
          sets: Array.from({ length: ex.sets }, () => ({
            repsCompleted: 10,
            weight: 50,
            rpe: 7,
            completed: true,
            skipped: false,
          })),
        }));

        await ctx.db.insert("gpp_workout_sessions", {
          userId: user._id,
          templateId: template._id,
          userProgramId: programId as Id<"user_programs">,
          startedAt: workoutDate,
          completedAt: workoutDate + 45 * 60 * 1000,
          totalDurationSeconds: 45 * 60,
          status: "completed",
          exercises: sessionExercises,
          templateSnapshot: {
            name: template.name,
            phase: "GPP",
            week,
            day,
            workoutDate,
          },
          scalingSnapshot: {
            categoryId: sport.gppCategoryId,
            phase: "GPP",
            ageGroup: "18-35",
            yearsOfExperience: 0.5,
          },
        });
        sessionsCreated.push(`W${week}D${day}: ${template.name}`);
      }
    }

    // 7. Create user_maxes
    const coreLiftSlugs = ["back_squat", "bench_press", "trap_bar_deadlift"];
    const coreMaxes: Record<string, number> = {
      back_squat: 185,
      bench_press: 135,
      trap_bar_deadlift: 225,
    };

    for (const slug of coreLiftSlugs) {
      const exercise = await ctx.db
        .query("exercises")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .first();
      if (exercise) {
        await ctx.db.insert("user_maxes", {
          userId: user._id,
          exerciseId: exercise._id,
          oneRepMax: coreMaxes[slug],
          source: "user_input",
          recordedAt: now - 28 * DAY_MS,
        });
      }
    }

    // 8. Mark user's intake and onboarding as complete
    await ctx.db.patch(user._id, {
      intakeCompletedAt: now - 28 * DAY_MS,
      onboardingCompletedAt: now - 28 * DAY_MS,
      onboardingProgress: 9,
    });

    return {
      success: true,
      state: "REASSESSMENT_BLOCKED",
      user: { id: user._id, email: user.email, name: user.name },
      program: {
        id: programId,
        position: `GPP Week ${weeksPerPhase}, Day ${preferredDays} (phase COMPLETE)`,
        reassessmentPendingForPhase: "GPP",
        skillLevel: "Novice",
      },
      sessionsCreated: sessionsCreated.length,
      instructions: [
        "1. Greg's GPP phase is marked as complete",
        "2. reassessmentPendingForPhase = 'GPP' is set",
        "3. Dashboard should show 'Phase Assessment Ready' banner",
        "4. SPP workouts should be BLOCKED until reassessment is completed",
        "5. Greg must complete the 4-screen reassessment flow to unlock SPP",
      ],
    };
  },
});
