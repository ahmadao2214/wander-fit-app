import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

const set = (completed: boolean) => ({ completed, skipped: false, repsCompleted: completed ? 12 : undefined });

/**
 * A session saved by builds that reordered completions: Romanian Deadlift's
 * slot holds Goblet Squat's six sets, with sets 4-6 logged. The execution
 * screen re-aligns completions by exerciseId, but only if getById hands it
 * the logged sets.
 */
async function setupScrambledSession() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: "athlete@example.com",
      name: "Athlete",
      clerkId: "clerk_athlete",
      role: "client",
      createdAt: now,
    });
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek: 3,
      assignedGppCategoryId: 2,
      assignedSkillLevel: "Moderate",
      intakeType: "initial",
      completedAt: now,
    });
    const userProgramId = await ctx.db.insert("user_programs", {
      userId,
      intakeResponseId,
      gppCategoryId: 2,
      skillLevel: "Moderate",
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      createdAt: now,
      updatedAt: now,
    });
    const goblet = await ctx.db.insert("exercises", { name: "Goblet Squat", slug: "goblet_squat", tags: ["squat"] });
    const rdl = await ctx.db.insert("exercises", { name: "Romanian Deadlift", slug: "romanian_deadlift", tags: ["hinge"] });
    const templateId = await ctx.db.insert("program_templates", {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Moderate",
      week: 1,
      day: 1,
      name: "Lower Body Foundation",
      estimatedDurationMinutes: 40,
      exercises: [
        { exerciseId: goblet, sets: 6, reps: "12", restSeconds: 60, orderIndex: 0 },
        { exerciseId: rdl, sets: 3, reps: "10", restSeconds: 60, orderIndex: 1 },
      ],
    });
    const sessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId,
      templateId,
      userProgramId,
      startedAt: now,
      status: "in_progress",
      exerciseOrder: [1, 0],
      exercises: [
        // Goblet Squat's slot holds Romanian Deadlift's sets
        { exerciseId: rdl, completed: false, skipped: false, sets: [set(false), set(false), set(false)] },
        // Romanian Deadlift's slot holds Goblet Squat's six sets, 4-6 logged
        {
          exerciseId: goblet,
          completed: false,
          skipped: false,
          sets: [set(false), set(false), set(false), set(true), set(true), set(true)],
        },
      ],
    });
    return { goblet, sessionId };
  });
  return { t, ids, asAthlete: t.withIdentity({ subject: "clerk_athlete", email: "athlete@example.com" }) };
}

describe("gppWorkoutSessions.getById set normalization", () => {
  it("keeps logged sets that sit past the prescription of the slot they were saved in", async () => {
    const { asAthlete, ids } = await setupScrambledSession();
    const session = await asAthlete.query(api.gppWorkoutSessions.getById, { sessionId: ids.sessionId });
    const goblet = session!.exercises.find((e) => e.exerciseId === ids.goblet)!;
    expect(goblet.sets.filter((s) => s.completed)).toHaveLength(3);
  });
});
