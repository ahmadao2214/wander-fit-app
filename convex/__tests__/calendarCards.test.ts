import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

// The week view's card says "N exercises". It counts the main work, the way
// Today does, not the warmup stretches that come first.
describe("calendar workout cards", () => {
  it("count main exercises, not warmup", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert("users", {
        email: "athlete@example.com",
        name: "Athlete",
        clerkId: "clerk_athlete",
        role: "client",
        createdAt: now,
        intakeCompletedAt: now,
      });
      const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
      const intakeResponseId = await ctx.db.insert("intake_responses", {
        userId,
        sportId,
        yearsOfExperience: 0,
        preferredTrainingDaysPerWeek: 3,
        assignedGppCategoryId: 2,
        assignedSkillLevel: "Novice",
        intakeType: "initial",
        completedAt: now,
      });
      await ctx.db.insert("user_programs", {
        userId,
        intakeResponseId,
        gppCategoryId: 2,
        skillLevel: "Novice",
        currentPhase: "GPP",
        currentWeek: 1,
        currentDay: 1,
        weeksPerPhase: 1,
        phaseStartDate: now,
        createdAt: now,
        updatedAt: now,
      });
      const exerciseId = await ctx.db.insert("exercises", { name: "Back Squat", slug: "back_squat", tags: [] });
      const ex = (orderIndex: number, section: "warmup" | "main") => ({
        exerciseId,
        sets: 3,
        reps: "5",
        restSeconds: 60,
        orderIndex,
        section,
      });
      await ctx.db.insert("program_templates", {
        gppCategoryId: 2,
        phase: "GPP",
        skillLevel: "Novice",
        week: 1,
        day: 1,
        name: "Lower Body Foundation",
        estimatedDurationMinutes: 30,
        exercises: [ex(0, "warmup"), ex(1, "warmup"), ex(2, "warmup"), ex(3, "main"), ex(4, "main")],
      });
    });
    const asAthlete = t.withIdentity({ subject: "clerk_athlete", email: "athlete@example.com" });
    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, {});
    const card = Object.values(calendar!.calendarData)
      .flatMap((d) => d.workouts)
      .find((w) => w.name === "Lower Body Foundation");
    expect(card?.exerciseCount).toBe(2);
    expect(card).not.toHaveProperty("exercisePreview");
  });
});
