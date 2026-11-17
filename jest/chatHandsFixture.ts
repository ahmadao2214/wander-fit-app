import { convexTest } from "convex-test";
import schema from "../convex/schema";
import { convexModules } from "./convexModules";

export const modules = convexModules();

/** One athlete past intake in GPP week 1, with two days and today's session in progress. */
export async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: "athlete@example.com",
      name: "Athlete",
      clerkId: "clerk_athlete",
      createdAt: now,
      intakeCompletedAt: now,
    });
    const sportId = await ctx.db.insert("sports", {
      name: "Basketball",
      gppCategoryId: 2,
    });
    const intakeId = await ctx.db.insert("intake_responses", {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek: 3,
      assignedGppCategoryId: 2,
      assignedSkillLevel: "Novice",
      intakeType: "initial",
      completedAt: now,
    });
    const squat = await ctx.db.insert("exercises", {
      name: "Goblet Squat",
      slug: "goblet_squat",
      tags: ["squat"],
    });
    const hinge = await ctx.db.insert("exercises", {
      name: "Hip Hinge",
      slug: "hip_hinge",
      tags: ["hinge"],
    });
    const stretch = await ctx.db.insert("exercises", {
      name: "World's Greatest Stretch",
      slug: "worlds_greatest_stretch",
      tags: ["mobility"],
    });
    const programId = await ctx.db.insert("user_programs", {
      userId,
      intakeResponseId: intakeId,
      gppCategoryId: 2,
      skillLevel: "Novice",
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      createdAt: now,
      updatedAt: now,
    });
    const prescription = (exerciseId: typeof squat, orderIndex: number) => ({
      exerciseId,
      sets: 3,
      reps: "8",
      restSeconds: 60,
      orderIndex,
    });
    const dayOne = await ctx.db.insert("program_templates", {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Novice",
      week: 1,
      day: 1,
      name: "Lower Body",
      estimatedDurationMinutes: 40,
      // Warm-up first, then the main lifts: template indices 1 and 2 are the main exercises.
      exercises: [
        { ...prescription(stretch, 0), section: "warmup" as const },
        prescription(squat, 1),
        prescription(hinge, 2),
      ],
    });
    const dayTwo = await ctx.db.insert("program_templates", {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Novice",
      week: 1,
      day: 2,
      name: "Upper Body",
      estimatedDurationMinutes: 40,
      exercises: [prescription(hinge, 0), prescription(squat, 1)],
    });
    const sessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId,
      templateId: dayOne,
      userProgramId: programId,
      startedAt: now,
      status: "in_progress",
      exercises: [
        {
          exerciseId: stretch,
          completed: false,
          skipped: false,
          sets: [{ completed: false, skipped: false }],
        },
        {
          exerciseId: squat,
          completed: false,
          skipped: false,
          sets: [{ completed: false, skipped: false }],
        },
        {
          exerciseId: hinge,
          completed: false,
          skipped: false,
          sets: [{ completed: false, skipped: false }],
        },
      ],
    });
    return { dayOne, dayTwo, stretch, squat, hinge, sessionId };
  });

  const asAthlete = t.withIdentity({
    subject: "clerk_athlete",
    email: "athlete@example.com",
  });
  return { t, asAthlete, ...ids };
}
