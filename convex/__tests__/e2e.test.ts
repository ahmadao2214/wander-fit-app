import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();
const newTest = () => convexTest(schema, modules);
type TestConvex = ReturnType<typeof newTest>;

const email = "e2e.1+clerk_test@example.com";
const persona = { clerkId: "user_e2e_1", email, name: "Verify Athlete" };

async function seedBasketball(t: TestConvex) {
  return t.run((ctx) => ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 }));
}

async function rowsFor(t: TestConvex) {
  return t.run(async (ctx) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!user) return { users: 0, programs: 0, intakes: 0, user: null };
    const programs = await ctx.db
      .query("user_programs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const intakes = await ctx.db
      .query("intake_responses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return { users: 1, programs: programs.length, intakes: intakes.length, user };
  });
}

describe("e2e persona provisioning", () => {
  it("needs-intake writes a user row only", async () => {
    const t = newTest();
    await seedBasketball(t);
    await t.mutation(internal.e2e.provision, { ...persona, state: "needs-intake" });

    const rows = await rowsFor(t);
    expect(rows).toMatchObject({ users: 1, programs: 0, intakes: 0 });
    expect(rows.user?.intakeCompletedAt).toBeUndefined();
    expect(rows.user?.onboardingCompletedAt).toBeUndefined();

    const inspected = await t.query(internal.e2e.inspect, { email });
    expect(inspected).toMatchObject({
      found: true,
      intakeCompleted: false,
      onboardingCompleted: false,
      hasProgram: false,
      phase: null,
    });
  });

  it("needs-intake resets a user that already had a program", async () => {
    const t = newTest();
    await seedBasketball(t);
    await t.mutation(internal.e2e.provision, { ...persona, state: "onboarded" });
    expect(await rowsFor(t)).toMatchObject({ programs: 1, intakes: 1 });

    await t.mutation(internal.e2e.provision, { ...persona, state: "needs-intake" });
    const rows = await rowsFor(t);
    expect(rows).toMatchObject({ users: 1, programs: 0, intakes: 0 });
    expect(rows.user?.onboardingSkipped).toBeUndefined();
  });

  it("inspect shows GPP week 1 day 1 after intake and onboarding through the app", async () => {
    const t = newTest();
    const sportId = await seedBasketball(t);
    await t.mutation(internal.e2e.provision, { ...persona, state: "needs-intake" });

    const athlete = t.withIdentity({ subject: persona.clerkId });
    await athlete.mutation(api.userPrograms.completeIntake, {
      sportId,
      yearsOfExperience: 0,
      preferredTrainingDaysPerWeek: 3,
      selectedTrainingDays: [1, 3, 5],
      weeksUntilSeason: 12,
      ageGroup: "18-35",
    });
    await athlete.mutation(api.onboarding.completeOnboarding, {});

    expect(await t.query(internal.e2e.inspect, { email })).toMatchObject({
      found: true,
      intakeCompleted: true,
      onboardingCompleted: true,
      hasProgram: true,
      phase: "GPP",
      week: 1,
      day: 1,
    });
  });

  it("remove deletes the user, program, and intake rows", async () => {
    const t = newTest();
    await seedBasketball(t);
    await t.mutation(internal.e2e.provision, { ...persona, state: "onboarded" });

    expect(await t.mutation(internal.e2e.remove, { email })).toEqual({ deleted: true, email });
    expect(await rowsFor(t)).toMatchObject({ users: 0, programs: 0, intakes: 0 });
    expect(await t.mutation(internal.e2e.remove, { email })).toEqual({ deleted: false, email });
  });

  it("with-history adds one completed GPP session that History lists, and remove deletes it", async () => {
    const t = newTest();
    await seedBasketball(t);
    await t.run(async (ctx) => {
      const exerciseId = await ctx.db.insert("exercises", { name: "Goblet Squat", slug: "goblet_squat", tags: [] });
      await ctx.db.insert("program_templates", {
        gppCategoryId: 2,
        phase: "GPP",
        skillLevel: "Novice",
        week: 1,
        day: 1,
        name: "Lower Body Foundation",
        estimatedDurationMinutes: 40,
        exercises: [{ exerciseId, sets: 3, reps: "10", restSeconds: 60, orderIndex: 0 }],
      });
    });
    await t.mutation(internal.e2e.provision, { ...persona, state: "with-history" });

    const asPersona = t.withIdentity({ subject: persona.clerkId, email });
    const history = await asPersona.query(api.gppWorkoutSessions.getHistory, {});
    expect(history.map((s) => [s.status, s.templateSnapshot?.name])).toEqual([["completed", "Lower Body Foundation"]]);

    // Installed builds still call the old endpoint and read the old field names
    const legacy = await asPersona.query(api.workoutSessions.getHistory, {});
    expect(legacy.map((s) => [s.totalDuration, s.workout.name, s.templateSnapshot?.name])).toEqual([
      [45 * 60, "Lower Body Foundation", "Lower Body Foundation"],
    ]);

    await t.mutation(internal.e2e.remove, { email });
    const left = await t.run((ctx) => ctx.db.query("gpp_workout_sessions").collect());
    expect(left).toEqual([]);
  });
});

describe("e2e template seed", () => {
  // Mirrors scripts/verify/run.mjs: seed:seedAll, then the generator per category.
  it("gives the e2e database the generated Day 1 that production serves", async () => {
    const t = newTest();
    await t.mutation(internal.seed.seedAll, {});
    // An older hand-written seed row must be replaced, not kept.
    await t.mutation(internal.seed.seedAllSkillLevelTemplates, {});
    for (const categoryId of [1, 2, 3, 4]) {
      await t.mutation(internal.generateTemplates.regenerateCategoryTemplates, {
        categoryId,
        failOnErrors: true,
      });
    }

    const day1 = await t.query(api.programTemplates.getWorkout, {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Novice",
      week: 1,
      day: 1,
    });
    expect(day1?.name).toBe("Lower Body A - Foundation");

    const count = await t.run(async (ctx) => (await ctx.db.query("program_templates").collect()).length);
    expect(count).toBe(4 * 3 * 3 * 4 * 7);

    // A second seed (every deploy) keeps template IDs, so saved sessions
    // still open their workout.
    await t.mutation(internal.generateTemplates.regenerateCategoryTemplates, {
      categoryId: 2,
      failOnErrors: true,
    });
    const again = await t.query(api.programTemplates.getWorkout, {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Novice",
      week: 1,
      day: 1,
    });
    expect(again?._id).toBe(day1?._id);
    const recount = await t.run(async (ctx) => (await ctx.db.query("program_templates").collect()).length);
    expect(recount).toBe(count);
  }, 60_000);
});
