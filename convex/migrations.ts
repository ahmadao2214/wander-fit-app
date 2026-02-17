import { mutation, query } from "./_generated/server";

const VALID_AGE_GROUPS = ["14-17", "18-35", "36+"];

function isLegacyAgeGroup(ag: unknown): boolean {
  return typeof ag === "string" && !VALID_AGE_GROUPS.includes(ag);
}

function mapLegacyAgeGroup(ag: string): "14-17" | "18-35" | "36+" {
  if (ag === "10-13") return "14-17";
  if (ag === "18+") return "18-35";
  return "18-35"; // safe default
}

/**
 * Find all documents with legacy ageGroup values across tables
 */
export const findLegacyAgeGroups = query({
  args: {},
  handler: async (ctx) => {
    const results: Array<{ table: string; id: string; ageGroup: string }> = [];

    const sessions = await ctx.db.query("gpp_workout_sessions").collect();
    for (const s of sessions) {
      const ag = (s.scalingSnapshot as any)?.ageGroup;
      if (isLegacyAgeGroup(ag)) {
        results.push({ table: "gpp_workout_sessions", id: s._id, ageGroup: ag });
      }
    }

    const intakes = await ctx.db.query("intake_responses").collect();
    for (const i of intakes) {
      if (isLegacyAgeGroup(i.ageGroup)) {
        results.push({ table: "intake_responses", id: i._id, ageGroup: i.ageGroup as string });
      }
    }

    const programs = await ctx.db.query("user_programs").collect();
    for (const p of programs) {
      if (isLegacyAgeGroup(p.ageGroup)) {
        results.push({ table: "user_programs", id: p._id, ageGroup: p.ageGroup as string });
      }
    }

    return results;
  },
});

/**
 * Fix all legacy ageGroup values across tables
 */
export const fixLegacyAgeGroups = mutation({
  args: {},
  handler: async (ctx) => {
    let fixed = 0;

    const sessions = await ctx.db.query("gpp_workout_sessions").collect();
    for (const s of sessions) {
      const snapshot = s.scalingSnapshot as any;
      if (snapshot?.ageGroup && isLegacyAgeGroup(snapshot.ageGroup)) {
        await ctx.db.patch(s._id, {
          scalingSnapshot: { ...snapshot, ageGroup: mapLegacyAgeGroup(snapshot.ageGroup) },
        });
        fixed++;
      }
    }

    const intakes = await ctx.db.query("intake_responses").collect();
    for (const i of intakes) {
      if (isLegacyAgeGroup(i.ageGroup)) {
        await ctx.db.patch(i._id, { ageGroup: mapLegacyAgeGroup(i.ageGroup as string) } as any);
        fixed++;
      }
    }

    const programs = await ctx.db.query("user_programs").collect();
    for (const p of programs) {
      if (isLegacyAgeGroup(p.ageGroup)) {
        await ctx.db.patch(p._id, { ageGroup: mapLegacyAgeGroup(p.ageGroup as string) } as any);
        fixed++;
      }
    }

    return { fixed };
  },
});
