import { query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

/**
 * Analytics Queries for History Screen
 *
 * Provides aggregated data for athlete progress visualization:
 * - Weekly workout trends (volume, duration, RPE)
 * - Exercise breakdown (most performed, skipped, etc.)
 * - Intensity distribution
 * - 1RM records
 */

// ─────────────────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the Monday of the week for a given timestamp (UTC-based)
 *
 * Uses UTC consistently to avoid timezone-related week boundary issues
 * for international users.
 */
function getWeekStartUTC(timestamp: number): Date {
  const date = new Date(timestamp);
  // Use UTC methods to avoid timezone issues
  const utcDay = date.getUTCDay();
  // Calculate days to subtract to get to Monday (0 = Sunday, 1 = Monday, etc.)
  const daysToMonday = utcDay === 0 ? 6 : utcDay - 1;

  // Create a new date at UTC midnight of that Monday
  const weekStart = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() - daysToMonday,
    0, 0, 0, 0
  ));

  return weekStart;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get current 1RM records for all tracked exercises
 *
 * Note: Currently only stores the latest 1RM per exercise, not history.
 * Future enhancement: Add user_maxes_history table for trend charts.
 */
export const get1RMRecords = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const maxes = await ctx.db
      .query("user_maxes")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Enrich with exercise details
    const enriched = await Promise.all(
      maxes.map(async (max) => {
        const exercise = await ctx.db.get(max.exerciseId);
        return {
          exerciseId: max.exerciseId,
          exerciseName: exercise?.name ?? "Unknown",
          exerciseSlug: exercise?.slug ?? "",
          value: max.oneRepMax,
          source: max.source,
          recordedAt: max.recordedAt,
        };
      })
    );

    return enriched;
  },
});

/**
 * Get weekly workout trends
 *
 * Returns data for the specified number of weeks:
 * - Workout count per week
 * - Total duration per week
 * - Total sets completed
 * - Average RPE
 */
export const getWeeklyTrends = query({
  args: {
    weeks: v.optional(v.number()), // Default: 12 weeks
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return [];

    const weeksToFetch = args.weeks ?? 12;
    const startDate = Date.now() - weeksToFetch * 7 * 24 * 60 * 60 * 1000;

    // Get all completed sessions in the date range
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Filter to completed sessions within date range
    const filteredSessions = sessions.filter(
      (s) =>
        s.status === "completed" &&
        s.completedAt &&
        s.completedAt >= startDate
    );

    // Group by week
    const weeklyData: Record<
      string,
      {
        weekStart: Date;
        workoutCount: number;
        totalDuration: number;
        totalSets: number;
        rpeValues: number[];
      }
    > = {};

    for (const session of filteredSessions) {
      const weekStart = getWeekStartUTC(session.completedAt!);
      const weekKey = weekStart.toISOString();

      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          weekStart,
          workoutCount: 0,
          totalDuration: 0,
          totalSets: 0,
          rpeValues: [],
        };
      }

      weeklyData[weekKey].workoutCount++;
      weeklyData[weekKey].totalDuration += session.totalDurationSeconds ?? 0;

      // Count sets and collect RPE values
      for (const ex of session.exercises ?? []) {
        for (const set of ex.sets ?? []) {
          if (set.completed) {
            weeklyData[weekKey].totalSets++;
            if (set.rpe) {
              weeklyData[weekKey].rpeValues.push(set.rpe);
            }
          }
        }
      }
    }

    // Convert to array and calculate averages
    const result = Object.values(weeklyData)
      .map((week) => ({
        weekStart: week.weekStart.toISOString(),
        workoutCount: week.workoutCount,
        totalDuration: Math.round(week.totalDuration / 60), // Convert to minutes
        totalSets: week.totalSets,
        avgRPE:
          week.rpeValues.length > 0
            ? Math.round(
                (week.rpeValues.reduce((a, b) => a + b, 0) /
                  week.rpeValues.length) *
                  10
              ) / 10
            : null,
      }))
      .sort(
        (a, b) =>
          new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );

    return result;
  },
});

/**
 * Get exercise breakdown statistics
 *
 * Returns:
 * - Most performed exercises
 * - Most skipped exercises
 * - Highest RPE exercises
 * - Lowest completion rate exercises
 */
export const getExerciseBreakdown = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    // Get all completed sessions
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completedSessions = sessions.filter((s) => s.status === "completed");

    // Collect exercise stats - use Map with Id as key for type safety
    const exerciseStats = new Map<
      Id<"exercises">,
      {
        exerciseId: Id<"exercises">;
        timesPerformed: number;
        timesSkipped: number;
        rpeValues: number[];
        totalVolume: number; // Sum of (weight × reps) per set
      }
    >();

    for (const session of completedSessions) {
      for (const ex of session.exercises ?? []) {
        const id = ex.exerciseId;

        if (!exerciseStats.has(id)) {
          exerciseStats.set(id, {
            exerciseId: id,
            timesPerformed: 0,
            timesSkipped: 0,
            rpeValues: [],
            totalVolume: 0,
          });
        }

        const stats = exerciseStats.get(id)!;

        if (ex.skipped) {
          stats.timesSkipped++;
        } else if (ex.completed) {
          stats.timesPerformed++;

          for (const set of ex.sets ?? []) {
            if (set.completed) {
              if (set.rpe) stats.rpeValues.push(set.rpe);
              // Calculate volume per set: weight × reps
              if (set.weight && set.repsCompleted) {
                stats.totalVolume += set.weight * set.repsCompleted;
              }
            }
          }
        }
      }
    }

    // Fetch exercise names using proper Convex IDs
    const exerciseNames = new Map<Id<"exercises">, string>();

    for (const id of exerciseStats.keys()) {
      const exercise = await ctx.db.get(id);
      exerciseNames.set(id, exercise?.name ?? "Unknown");
    }

    // Convert to array with calculated metrics
    const exercises = Array.from(exerciseStats.entries()).map(([id, stats]) => {
      const total = stats.timesPerformed + stats.timesSkipped;
      return {
        exerciseId: id,
        name: exerciseNames.get(id) ?? "Unknown",
        timesPerformed: stats.timesPerformed,
        timesSkipped: stats.timesSkipped,
        completionRate: total > 0 ? stats.timesPerformed / total : 0,
        avgRPE:
          stats.rpeValues.length > 0
            ? Math.round(
                (stats.rpeValues.reduce((a, b) => a + b, 0) /
                  stats.rpeValues.length) *
                  10
              ) / 10
            : null,
        totalVolume: stats.totalVolume,
      };
    });

    return {
      mostPerformed: [...exercises]
        .sort((a, b) => b.timesPerformed - a.timesPerformed)
        .slice(0, 10),
      mostSkipped: [...exercises]
        .sort((a, b) => b.timesSkipped - a.timesSkipped)
        .filter((e) => e.timesSkipped > 0)
        .slice(0, 5),
      highestRPE: [...exercises]
        .filter((e) => e.avgRPE !== null)
        .sort((a, b) => (b.avgRPE ?? 0) - (a.avgRPE ?? 0))
        .slice(0, 5),
      lowestCompletion: [...exercises]
        .filter((e) => e.timesPerformed + e.timesSkipped > 2)
        .sort((a, b) => a.completionRate - b.completionRate)
        .slice(0, 5),
    };
  },
});

/**
 * Get intensity distribution across all completed workouts
 *
 * Returns count and percentage for each intensity level.
 */
export const getIntensityDistribution = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    // Get all completed sessions
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completedSessions = sessions.filter((s) => s.status === "completed");

    const distribution = {
      Low: 0,
      Moderate: 0,
      High: 0,
    };

    for (const session of completedSessions) {
      const intensity = session.targetIntensity ?? "Moderate";
      if (intensity in distribution) {
        distribution[intensity as keyof typeof distribution]++;
      }
    }

    const total = completedSessions.length || 1;

    return {
      Low: {
        count: distribution.Low,
        percentage: Math.round((distribution.Low / total) * 100),
      },
      Moderate: {
        count: distribution.Moderate,
        percentage: Math.round((distribution.Moderate / total) * 100),
      },
      High: {
        count: distribution.High,
        percentage: Math.round((distribution.High / total) * 100),
      },
    };
  },
});

/**
 * Get comprehensive analytics summary
 *
 * Combines multiple metrics into a single response for efficiency.
 */
export const getAnalyticsSummary = query({
  args: {
    weeks: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const weeksToFetch = args.weeks ?? 12;
    const startDate = Date.now() - weeksToFetch * 7 * 24 * 60 * 60 * 1000;

    // Get all sessions
    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const completedSessions = sessions.filter((s) => s.status === "completed");
    const recentSessions = completedSessions.filter(
      (s) => s.completedAt && s.completedAt >= startDate
    );

    // Calculate basic metrics
    const totalWorkouts = completedSessions.length;
    const totalDuration = completedSessions.reduce(
      (sum, s) => sum + (s.totalDurationSeconds ?? 0),
      0
    );

    // Calculate weekly averages from recent sessions
    const weeklyWorkouts =
      recentSessions.length / Math.max(1, weeksToFetch);
    const avgDuration =
      recentSessions.length > 0
        ? recentSessions.reduce(
            (sum, s) => sum + (s.totalDurationSeconds ?? 0),
            0
          ) /
          recentSessions.length /
          60
        : 0;

    // Get all RPE values
    const allRPEs: number[] = [];
    for (const session of recentSessions) {
      for (const ex of session.exercises ?? []) {
        for (const set of ex.sets ?? []) {
          if (set.rpe && set.completed) {
            allRPEs.push(set.rpe);
          }
        }
      }
    }

    const avgRPE =
      allRPEs.length > 0
        ? Math.round(
            (allRPEs.reduce((a, b) => a + b, 0) / allRPEs.length) * 10
          ) / 10
        : null;

    return {
      totalWorkouts,
      totalDurationMinutes: Math.round(totalDuration / 60),
      avgWorkoutsPerWeek: Math.round(weeklyWorkouts * 10) / 10,
      avgDurationMinutes: Math.round(avgDuration),
      avgRPE,
      recentWorkoutCount: recentSessions.length,
    };
  },
});
