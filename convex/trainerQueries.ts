import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get detailed athlete information for trainer dashboard
 * Includes program state, progress, and last workout info
 */
export const getAthleteDetails = query({
  args: { athleteUserId: v.id("users") },
  handler: async (ctx, args) => {
    const athlete = await ctx.db.get(args.athleteUserId);
    if (!athlete) return null;

    // Get active program
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    // Get intake for sport info
    let sport = null;
    let intakeResponse = null;
    if (program) {
      intakeResponse = await ctx.db.get(program.intakeResponseId);
      if (intakeResponse) {
        sport = await ctx.db.get(intakeResponse.sportId);
      }
    }

    // Get progress
    const progress = program
      ? await ctx.db
          .query("user_progress")
          .withIndex("by_program", (q) => q.eq("userProgramId", program._id))
          .first()
      : null;

    // Get recent completed sessions (last 10)
    const recentSessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", args.athleteUserId).eq("status", "completed")
      )
      .order("desc")
      .take(10);

    // Calculate consistency (workouts in last 7 days)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentWorkouts = recentSessions.filter(
      (s) => s.completedAt && s.completedAt > oneWeekAgo
    );

    return {
      athlete: {
        _id: athlete._id,
        name: athlete.name,
        email: athlete.email,
      },
      program: program
        ? {
            _id: program._id,
            currentPhase: program.currentPhase,
            currentWeek: program.currentWeek,
            currentDay: program.currentDay,
            skillLevel: program.skillLevel,
            lastWorkoutDate: program.lastWorkoutDate,
            phaseStartDate: program.phaseStartDate,
          }
        : null,
      sport: sport?.name ?? null,
      ageGroup: program?.ageGroup ?? intakeResponse?.ageGroup ?? null,
      progress: progress
        ? {
            daysCompleted: progress.daysCompleted,
            weeksCompleted: progress.weeksCompleted,
            currentStreak: progress.currentStreak,
            longestStreak: progress.longestStreak,
            uniqueExercisesPerformed: progress.uniqueExercisesPerformed.length,
          }
        : null,
      recentWorkoutsCount: recentWorkouts.length,
      totalCompletedWorkouts: recentSessions.length,
    };
  },
});

/**
 * Get athlete's workout history with exercise details
 */
export const getAthleteWorkoutHistory = query({
  args: {
    athleteUserId: v.id("users"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;
    const offset = args.offset ?? 0;

    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .order("desc")
      .collect();

    // Apply pagination
    const paginatedSessions = sessions.slice(offset, offset + limit);

    // Get template details for each session
    const sessionsWithDetails = await Promise.all(
      paginatedSessions.map(async (session) => {
        const template = await ctx.db.get(session.templateId);

        // Get exercise names
        const exerciseDetails = await Promise.all(
          session.exercises.map(async (ex) => {
            const exercise = await ctx.db.get(ex.exerciseId);
            return {
              ...ex,
              exerciseName: exercise?.name ?? "Unknown Exercise",
            };
          })
        );

        return {
          _id: session._id,
          startedAt: session.startedAt,
          completedAt: session.completedAt,
          status: session.status,
          totalDurationSeconds: session.totalDurationSeconds,
          targetIntensity: session.targetIntensity,
          templateName: template?.name ?? session.templateSnapshot?.name ?? "Unknown Workout",
          phase: session.templateSnapshot?.phase ?? template?.phase,
          week: session.templateSnapshot?.week ?? template?.week,
          day: session.templateSnapshot?.day ?? template?.day,
          exercises: exerciseDetails,
          exerciseCount: exerciseDetails.length,
          completedExerciseCount: exerciseDetails.filter((e) => e.completed).length,
          skippedExerciseCount: exerciseDetails.filter((e) => e.skipped).length,
        };
      })
    );

    return {
      sessions: sessionsWithDetails,
      total: sessions.length,
      hasMore: offset + limit < sessions.length,
    };
  },
});

/**
 * Get athlete's current scheduled workout
 */
export const getAthleteCurrentWorkout = query({
  args: { athleteUserId: v.id("users") },
  handler: async (ctx, args) => {
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    if (!program) return null;

    // Get intake for category
    const intake = await ctx.db.get(program.intakeResponseId);
    if (!intake) return null;

    // Check for schedule overrides
    const override = await ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first();

    let templateId = null;

    // Check for today's focus override
    if (override?.todayFocusTemplateId) {
      templateId = override.todayFocusTemplateId;
    } else {
      // Check for slot override
      const slotOverride = override?.slotOverrides.find(
        (o) =>
          o.phase === program.currentPhase &&
          o.week === program.currentWeek &&
          o.day === program.currentDay
      );

      if (slotOverride) {
        templateId = slotOverride.templateId;
      }
    }

    // Get template by assignment if no override
    if (!templateId) {
      const template = await ctx.db
        .query("program_templates")
        .withIndex("by_assignment", (q) =>
          q
            .eq("gppCategoryId", intake.assignedGppCategoryId)
            .eq("phase", program.currentPhase)
            .eq("skillLevel", program.skillLevel)
            .eq("week", program.currentWeek)
            .eq("day", program.currentDay)
        )
        .first();

      if (template) {
        templateId = template._id;
      }
    }

    if (!templateId) return null;

    const template = await ctx.db.get(templateId);
    if (!template) return null;

    // Get exercise details
    const exercisesWithDetails = await Promise.all(
      template.exercises.map(async (ex) => {
        const exercise = await ctx.db.get(ex.exerciseId);
        return {
          ...ex,
          exerciseName: exercise?.name ?? "Unknown",
          exerciseInstructions: exercise?.instructions,
        };
      })
    );

    return {
      template: {
        _id: template._id,
        name: template.name,
        description: template.description,
        phase: template.phase,
        week: template.week,
        day: template.day,
        estimatedDurationMinutes: template.estimatedDurationMinutes,
      },
      exercises: exercisesWithDetails,
      programPosition: {
        phase: program.currentPhase,
        week: program.currentWeek,
        day: program.currentDay,
      },
    };
  },
});

/**
 * Get trainer dashboard stats
 */
export const getTrainerDashboardStats = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all active relationships
    const relationships = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .collect();

    const athleteIds = relationships.map((r) => r.athleteUserId);

    // Count athletes with programs
    let athletesWithPrograms = 0;
    let totalCompletedWorkouts = 0;
    let totalTrainingMinutes = 0;

    for (const athleteId of athleteIds) {
      const program = await ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", athleteId))
        .first();

      if (program) {
        athletesWithPrograms++;
      }

      // Get completed sessions
      const sessions = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", athleteId).eq("status", "completed")
        )
        .collect();

      totalCompletedWorkouts += sessions.length;

      // Sum up training time
      for (const session of sessions) {
        if (session.totalDurationSeconds) {
          totalTrainingMinutes += Math.round(session.totalDurationSeconds / 60);
        }
      }
    }

    // Get recent activity (workouts in last 7 days)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let recentWorkouts = 0;

    for (const athleteId of athleteIds) {
      const sessions = await ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", athleteId).eq("status", "completed")
        )
        .collect();

      recentWorkouts += sessions.filter(
        (s) => s.completedAt && s.completedAt > oneWeekAgo
      ).length;
    }

    return {
      totalAthletes: relationships.length,
      athletesWithPrograms,
      totalCompletedWorkouts,
      totalTrainingMinutes,
      recentWorkouts,
    };
  },
});

/**
 * Get athlete's program overview for trainer
 */
export const getAthleteProgramOverview = query({
  args: { athleteUserId: v.id("users") },
  handler: async (ctx, args) => {
    const program = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .first();

    if (!program) return null;

    const intake = await ctx.db.get(program.intakeResponseId);
    if (!intake) return null;

    const sport = await ctx.db.get(intake.sportId);

    // Get all templates for this program
    const templates = await ctx.db
      .query("program_templates")
      .withIndex("by_category_phase", (q) =>
        q.eq("gppCategoryId", intake.assignedGppCategoryId)
      )
      .collect();

    // Filter by skill level
    const programTemplates = templates.filter(
      (t) => t.skillLevel === program.skillLevel
    );

    // Organize by phase/week/day
    const phases = ["GPP", "SPP", "SSP"] as const;
    const programStructure = phases.map((phase) => {
      const phaseTemplates = programTemplates.filter((t) => t.phase === phase);
      const weeks: Array<{
        week: number;
        days: Array<{ day: number; template: typeof phaseTemplates[0] | null }>;
      }> = [];

      for (let week = 1; week <= 4; week++) {
        const weekTemplates = phaseTemplates.filter((t) => t.week === week);
        const days: Array<{ day: number; template: typeof phaseTemplates[0] | null }> = [];

        for (let day = 1; day <= 7; day++) {
          const dayTemplate = weekTemplates.find((t) => t.day === day) ?? null;
          days.push({ day, template: dayTemplate });
        }

        weeks.push({ week, days });
      }

      return {
        phase,
        unlocked:
          phase === "GPP"
            ? true
            : phase === "SPP"
              ? !!program.sppUnlockedAt
              : !!program.sspUnlockedAt,
        weeks,
      };
    });

    return {
      program: {
        _id: program._id,
        currentPhase: program.currentPhase,
        currentWeek: program.currentWeek,
        currentDay: program.currentDay,
        skillLevel: program.skillLevel,
        ageGroup: program.ageGroup,
      },
      sport: sport?.name ?? null,
      gppCategoryId: intake.assignedGppCategoryId,
      structure: programStructure,
    };
  },
});
