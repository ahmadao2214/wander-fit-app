// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api, internal } from "../_generated/api";

const modules = import.meta.glob("../**/*.ts");
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
});
