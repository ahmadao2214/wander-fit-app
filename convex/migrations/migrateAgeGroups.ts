import { internalMutation } from "../_generated/server";

/**
 * One-time migration: Update legacy age group values in all affected tables.
 *
 * Mapping:
 *   "10-13" → "14-17" (closest youth category)
 *   "18+"   → "18-35" (default adult category)
 *
 * Affected tables:
 *   1. intake_responses.ageGroup
 *   2. user_programs.ageGroup
 *   3. gpp_workout_sessions.scalingSnapshot.ageGroup
 *
 * Idempotent: safe to run multiple times.
 * Usage: npx convex run migrations/migrateAgeGroups:migrateAllAgeGroups
 */

const LEGACY_MAP: Record<string, "14-17" | "18-35" | "36+"> = {
  "10-13": "14-17",
  "18+": "18-35",
};

function isLegacyAgeGroup(value: string | undefined): value is "10-13" | "18+" {
  return value !== undefined && value in LEGACY_MAP;
}

export const migrateAllAgeGroups = internalMutation({
  args: {},
  handler: async (ctx) => {
    const results = {
      intake_responses: { scanned: 0, migrated: 0 },
      user_programs: { scanned: 0, migrated: 0 },
      gpp_workout_sessions: { scanned: 0, migrated: 0 },
    };

    // 1. intake_responses
    const intakes = await ctx.db.query("intake_responses").collect();
    results.intake_responses.scanned = intakes.length;
    for (const intake of intakes) {
      if (isLegacyAgeGroup(intake.ageGroup)) {
        await ctx.db.patch(intake._id, {
          ageGroup: LEGACY_MAP[intake.ageGroup],
        });
        results.intake_responses.migrated++;
      }
    }

    // 2. user_programs
    const programs = await ctx.db.query("user_programs").collect();
    results.user_programs.scanned = programs.length;
    for (const program of programs) {
      if (isLegacyAgeGroup(program.ageGroup)) {
        await ctx.db.patch(program._id, {
          ageGroup: LEGACY_MAP[program.ageGroup],
        });
        results.user_programs.migrated++;
      }
    }

    // 3. gpp_workout_sessions (ageGroup is nested in scalingSnapshot)
    const sessions = await ctx.db.query("gpp_workout_sessions").collect();
    results.gpp_workout_sessions.scanned = sessions.length;
    for (const session of sessions) {
      if (
        session.scalingSnapshot &&
        isLegacyAgeGroup(session.scalingSnapshot.ageGroup)
      ) {
        await ctx.db.patch(session._id, {
          scalingSnapshot: {
            ...session.scalingSnapshot,
            ageGroup: LEGACY_MAP[session.scalingSnapshot.ageGroup],
          },
        });
        results.gpp_workout_sessions.migrated++;
      }
    }

    return results;
  },
});
