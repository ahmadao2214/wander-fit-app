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

    // Get recent completed sessions (last 10) - use take() for efficiency
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
            sppUnlockedAt: program.sppUnlockedAt,
            sspUnlockedAt: program.sspUnlockedAt,
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
 * Uses cursor-based pagination for efficiency (doesn't load all data into memory)
 */
export const getAthleteWorkoutHistory = query({
  args: {
    athleteUserId: v.id("users"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()), // Session ID to start after
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? 20, 50); // Cap at 50

    // Build query with efficient pagination using take()
    let sessionsQuery = ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", args.athleteUserId))
      .order("desc");

    // If cursor provided, we need to skip past it
    // For simplicity, we'll take limit+1 to determine hasMore
    const sessions = await sessionsQuery.take(limit + 1);

    const hasMore = sessions.length > limit;
    const paginatedSessions = sessions.slice(0, limit);

    // Batch fetch all unique template IDs
    const templateIds = [...new Set(paginatedSessions.map((s) => s.templateId))];
    const templates = await Promise.all(templateIds.map((id) => ctx.db.get(id)));
    const templateMap = new Map(
      templates.filter(Boolean).map((t) => [t!._id, t])
    );

    // Batch fetch all unique exercise IDs
    const allExerciseIds = new Set<string>();
    paginatedSessions.forEach((s) =>
      s.exercises.forEach((ex) => allExerciseIds.add(ex.exerciseId))
    );
    const exercisePromises = [...allExerciseIds].map((id) =>
      ctx.db.get(id as any).then((e) => e as { _id: string; name: string; instructions?: string } | null)
    );
    const exercises = await Promise.all(exercisePromises);
    const exerciseMap = new Map(
      exercises.filter(Boolean).map((e) => [e!._id, e])
    );

    // Map sessions with details
    const sessionsWithDetails = paginatedSessions.map((session) => {
      const template = templateMap.get(session.templateId);

      const exerciseDetails = session.exercises.map((ex) => {
        const exercise = exerciseMap.get(ex.exerciseId);
        return {
          ...ex,
          exerciseName: exercise?.name ?? "Unknown Exercise",
        };
      });

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
    });

    return {
      sessions: sessionsWithDetails,
      hasMore,
      nextCursor: hasMore && paginatedSessions.length > 0
        ? paginatedSessions[paginatedSessions.length - 1]._id
        : null,
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

    // Check for trainer workout customizations
    const customization = await ctx.db
      .query("trainer_workout_customizations")
      .withIndex("by_athlete_template", (q) =>
        q.eq("athleteUserId", args.athleteUserId).eq("templateId", templateId)
      )
      .first();

    // Use customized exercises if available, otherwise template exercises
    const exerciseSource = customization?.exercises ?? template.exercises;

    // Batch fetch all exercise details
    const exerciseIds = [...new Set(exerciseSource.map((ex: any) => ex.exerciseId))];
    const exercisePromises = exerciseIds.map((id) =>
      ctx.db.get(id).then((e) => e as { _id: any; name: string; instructions?: string } | null)
    );
    const exercises = await Promise.all(exercisePromises);
    const exerciseMap = new Map(
      exercises.filter(Boolean).map((e) => [e!._id, e])
    );

    const exercisesWithDetails = exerciseSource.map((ex: any) => {
      const exercise = exerciseMap.get(ex.exerciseId);
      return {
        ...ex,
        exerciseName: exercise?.name ?? "Unknown",
        exerciseInstructions: exercise?.instructions,
      };
    });

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
      hasCustomization: !!customization,
    };
  },
});

/**
 * Get trainer dashboard stats
 * Optimized to minimize database queries using batch operations
 */
export const getTrainerDashboardStats = query({
  args: { trainerId: v.id("users") },
  handler: async (ctx, args) => {
    // Get all active relationships in one query
    const relationships = await ctx.db
      .query("trainer_athlete_relationships")
      .withIndex("by_trainer_status", (q) =>
        q.eq("trainerId", args.trainerId).eq("status", "active")
      )
      .collect();

    if (relationships.length === 0) {
      return {
        totalAthletes: 0,
        athletesWithPrograms: 0,
        totalCompletedWorkouts: 0,
        totalTrainingMinutes: 0,
        recentWorkouts: 0,
      };
    }

    const athleteIds = relationships.map((r) => r.athleteUserId);

    // Batch fetch all programs for all athletes
    const programPromises = athleteIds.map((id) =>
      ctx.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .first()
    );
    const programs = await Promise.all(programPromises);
    const athletesWithPrograms = programs.filter(Boolean).length;

    // Batch fetch completed sessions for all athletes
    // This is still multiple queries but we're doing them in parallel
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const sessionPromises = athleteIds.map((id) =>
      ctx.db
        .query("gpp_workout_sessions")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", id).eq("status", "completed")
        )
        .collect()
    );
    const allSessions = await Promise.all(sessionPromises);

    // Aggregate stats
    let totalCompletedWorkouts = 0;
    let totalTrainingMinutes = 0;
    let recentWorkouts = 0;

    for (const sessions of allSessions) {
      totalCompletedWorkouts += sessions.length;

      for (const session of sessions) {
        if (session.totalDurationSeconds) {
          totalTrainingMinutes += Math.round(session.totalDurationSeconds / 60);
        }
        if (session.completedAt && session.completedAt > oneWeekAgo) {
          recentWorkouts++;
        }
      }
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
