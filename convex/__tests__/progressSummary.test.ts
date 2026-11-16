import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();
const clerkId = "clerk_weeks_on_plan";

/** Noon UTC on a date */
const at = (date: string, hourUtc = 12) =>
  Date.parse(`${date}T${String(hourUtc).padStart(2, "0")}:00:00Z`);

type SessionSpec = { completedAt: number; status?: "completed" | "abandoned" | "in_progress" };

/** A Mon/Wed/Fri athlete (3 a week) with the given sessions */
async function setup(
  sessions: SessionSpec[],
  { selectedTrainingDays = [1, 3, 5], preferredTrainingDaysPerWeek = 3, pausedAt }: {
    selectedTrainingDays?: number[];
    preferredTrainingDaysPerWeek?: number;
    pausedAt?: number;
  } = {}
) {
  const t = convexTest(schema, modules);
  await t.run(async (ctx) => {
    const now = at("2026-11-01");
    const userId = await ctx.db.insert("users", {
      email: "athlete@example.com",
      name: "Athlete",
      clerkId,
      createdAt: now,
    });
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek,
      selectedTrainingDays,
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
      pausedAt,
    });
    const templateId = await ctx.db.insert("program_templates", {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Moderate",
      week: 1,
      day: 1,
      name: "Lower Body Foundation",
      estimatedDurationMinutes: 40,
      exercises: [],
    });
    for (const { completedAt, status = "completed" } of sessions) {
      await ctx.db.insert("gpp_workout_sessions", {
        userId,
        templateId,
        userProgramId,
        startedAt: completedAt - 40 * 60_000,
        completedAt: status === "completed" ? completedAt : undefined,
        status,
        exercises: [],
      });
    }
  });
  return t.withIdentity({ subject: clerkId });
}

const monWedFri = (mon: string, wed: string, fri: string) => [at(mon), at(wed), at(fri)];
const weekOf2nd = monWedFri("2026-11-02", "2026-11-04", "2026-11-06");
const weekOf9th = monWedFri("2026-11-09", "2026-11-11", "2026-11-13");
const done = (times: number[]): SessionSpec[] => times.map((completedAt) => ({ completedAt }));

describe("getProgressSummary weeks on plan", () => {
  it("derives weeks on plan from completed sessions", async () => {
    const athlete = await setup(done([...weekOf2nd, ...weekOf9th]));
    const summary = await athlete.query(api.userPrograms.getProgressSummary, {
      today: "2026-11-16",
      timezoneOffsetMinutes: 0,
    });
    expect(summary?.daysCompleted).toBe(6);
    expect(summary?.weeksOnPlan).toBe(2);
  });

  it("no longer returns the never-written user_progress streak fields", async () => {
    const athlete = await setup(done(weekOf2nd));
    const summary = await athlete.query(api.userPrograms.getProgressSummary, { today: "2026-11-09" });
    expect(summary).not.toHaveProperty("currentStreak");
    expect(summary).not.toHaveProperty("longestStreak");
    expect(summary).not.toHaveProperty("averageWorkoutsPerWeek");
  });

  it("leaves out abandoned and unfinished sessions", async () => {
    const athlete = await setup([
      ...done(weekOf2nd),
      ...done(weekOf9th.slice(0, 2)),
      { completedAt: weekOf9th[2], status: "abandoned" },
      { completedAt: at("2026-11-16"), status: "in_progress" },
    ]);
    const summary = await athlete.query(api.userPrograms.getProgressSummary, {
      today: "2026-11-17",
      timezoneOffsetMinutes: 0,
    });
    // Week of the 9th has 2 of 3 completed, so the run ends there
    expect(summary?.weeksOnPlan).toBe(0);
  });

  it("uses the scheduled day count from the intake", async () => {
    const twoAWeek = done([at("2026-11-02"), at("2026-11-05"), at("2026-11-09"), at("2026-11-12")]);
    const athlete = await setup(twoAWeek, { selectedTrainingDays: [1, 4], preferredTrainingDaysPerWeek: 2 });
    const summary = await athlete.query(api.userPrograms.getProgressSummary, {
      today: "2026-11-16",
      timezoneOffsetMinutes: 0,
    });
    expect(summary?.weeksOnPlan).toBe(2);
  });

  it("buckets days by the athlete's offset", async () => {
    // Sunday 2026-11-08, 9pm in LA is Monday 05:00 UTC: the week of the 2nd only in LA.
    const sundayNight = at("2026-11-09", 5);
    const athlete = await setup(done([at("2026-11-02"), at("2026-11-04"), sundayNight, at("2026-11-11"), at("2026-11-13")]));
    const la = await athlete.query(api.userPrograms.getProgressSummary, {
      today: "2026-11-14",
      timezoneOffsetMinutes: 480,
    });
    const utc = await athlete.query(api.userPrograms.getProgressSummary, {
      today: "2026-11-16",
      timezoneOffsetMinutes: 0,
    });
    // LA: week of the 2nd has 3 (on plan), week of the 9th is in progress
    expect(la?.weeksOnPlan).toBe(1);
    // UTC: week of the 2nd is the short first week, week of the 9th has 3
    expect(utc?.weeksOnPlan).toBe(1);
  });

  it("keeps the streak while the program is paused", async () => {
    const athlete = await setup(done([...weekOf2nd, ...weekOf9th]), { pausedAt: at("2026-11-15") });
    const summary = await athlete.query(api.userPrograms.getProgressSummary, {
      today: "2026-11-25",
      timezoneOffsetMinutes: 0,
    });
    expect(summary?.weeksOnPlan).toBe(2);
  });

  it("falls back to UTC days when an older build sends no date", async () => {
    jest.useFakeTimers({ now: at("2026-11-16") });
    try {
      const athlete = await setup(done([...weekOf2nd, ...weekOf9th]));
      const summary = await athlete.query(api.userPrograms.getProgressSummary, {});
      expect(summary?.weeksOnPlan).toBe(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it("is null when signed out", async () => {
    const t = convexTest(schema, modules);
    expect(await t.query(api.userPrograms.getProgressSummary, {})).toBeNull();
  });
});
