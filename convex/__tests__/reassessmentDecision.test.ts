import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();
const DAY = 24 * 60 * 60 * 1000;

/**
 * A Novice athlete at the end of a 1-week GPP block, 3 days a week
 * (3 planned sessions), with a check-in pending.
 */
async function setup({ completedInBlock = 3, completedBeforeBlock = 0 } = {}) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const blockStart = now - 7 * DAY;
    const userId = await ctx.db.insert("users", {
      email: "athlete@example.com",
      name: "Athlete",
      clerkId: "clerk_athlete",
      role: "client",
      createdAt: now,
      intakeCompletedAt: now - 30 * DAY,
    });
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId,
      sportId,
      yearsOfExperience: 1,
      preferredTrainingDaysPerWeek: 3,
      assignedGppCategoryId: 2,
      assignedSkillLevel: "Novice",
      intakeType: "initial",
      completedAt: now - 30 * DAY,
    });
    const programId = await ctx.db.insert("user_programs", {
      userId,
      intakeResponseId,
      gppCategoryId: 2,
      skillLevel: "Novice",
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 3,
      weeksPerPhase: 1,
      phaseStartDate: blockStart,
      reassessmentPendingForPhase: "GPP",
      createdAt: now - 30 * DAY,
      updatedAt: now,
    });
    // The block's three workouts, days 1-3 of week 1
    const templateIds: Id<"program_templates">[] = [];
    for (const day of [1, 2, 3]) {
      templateIds.push(
        await ctx.db.insert("program_templates", {
          gppCategoryId: 2,
          phase: "GPP",
          skillLevel: "Novice",
          week: 1,
          day,
          name: `GPP day ${day}`,
          estimatedDurationMinutes: 30,
          exercises: [],
        })
      );
    }
    // The i-th completed session is the workout for day (i % 3) + 1
    const session = (i: number, completedAt: number) =>
      ctx.db.insert("gpp_workout_sessions", {
        userId,
        templateId: templateIds[i % 3],
        userProgramId: programId,
        startedAt: completedAt - 30 * 60 * 1000,
        completedAt,
        status: "completed",
        templateSnapshot: { name: `GPP day ${(i % 3) + 1}`, phase: "GPP", week: 1, day: (i % 3) + 1, workoutDate: completedAt },
        exercises: [],
      });
    for (let i = 0; i < completedInBlock; i++) await session(i, blockStart + (i + 1) * DAY);
    // Sessions from an earlier GPP block, before this one started
    for (let i = 0; i < completedBeforeBlock; i++) await session(i, blockStart - (i + 1) * DAY);
    return { programId, templateIds };
  });
  const asAthlete = t.withIdentity({ subject: "clerk_athlete", email: "athlete@example.com" });
  return { t, ids, asAthlete };
}

const checkIn = { phaseDifficulty: "just_right" as const, maxesUpdated: false };

describe("end-of-block check-in", () => {
  it("counts only the sessions in the block that just ended", async () => {
    const { asAthlete } = await setup({ completedInBlock: 1, completedBeforeBlock: 3 });
    const status = await asAthlete.query(api.userPrograms.getReassessmentStatus, {});
    expect(status?.completionStats).toMatchObject({ completed: 1, expected: 3 });
    expect(typeof status?.completionStats?.blockStartedAt).toBe("number");
  });

  it("Move on starts the next phase, unlocks it, and can raise the skill level", async () => {
    const { t, ids, asAthlete } = await setup({ completedInBlock: 3 });
    const result = await asAthlete.mutation(api.userPrograms.completeReassessment, {
      ...checkIn,
      decision: "move_on",
    });
    expect(result).toMatchObject({ decision: "move_on", nextPhase: "SPP", skillLevelChanged: true });

    const program = await t.run((ctx) => ctx.db.get(ids.programId));
    expect(program).toMatchObject({ currentPhase: "SPP", currentWeek: 1, currentDay: 1, skillLevel: "Moderate" });
    expect(program?.reassessmentPendingForPhase).toBeUndefined();
    expect(typeof program?.sppUnlockedAt).toBe("number");
  });

  it("Repeat runs the same phase from week 1, with no unlock and no skill change", async () => {
    const { t, ids, asAthlete } = await setup({ completedInBlock: 3 });
    const before = await t.run((ctx) => ctx.db.get(ids.programId));
    const result = await asAthlete.mutation(api.userPrograms.completeReassessment, {
      ...checkIn,
      decision: "repeat",
    });
    expect(result).toMatchObject({ decision: "repeat", nextPhase: "GPP", skillLevelChanged: false });

    const program = await t.run((ctx) => ctx.db.get(ids.programId));
    expect(program).toMatchObject({ currentPhase: "GPP", currentWeek: 1, currentDay: 1, skillLevel: "Novice" });
    expect(program?.reassessmentPendingForPhase).toBeUndefined();
    expect(program?.sppUnlockedAt).toBeUndefined();
    expect(program!.phaseStartDate).toBeGreaterThan(before!.phaseStartDate);

    // The check-in record keeps the choice
    const record = await t.run((ctx) => ctx.db.get(program!.intakeResponseId));
    expect(record).toMatchObject({ intakeType: "reassessment", completedPhase: "GPP", reassessmentDecision: "repeat" });
  });

  it("a repeated block starts its count from zero", async () => {
    const { t, ids, asAthlete } = await setup({ completedInBlock: 3 });
    await asAthlete.mutation(api.userPrograms.completeReassessment, { ...checkIn, decision: "repeat" });
    // The repeated block ends with nothing logged
    await t.run((ctx) => ctx.db.patch(ids.programId, { reassessmentPendingForPhase: "GPP" }));
    const status = await asAthlete.query(api.userPrograms.getReassessmentStatus, {});
    expect(status?.completionStats).toMatchObject({ completed: 0, expected: 3 });
  });

  it("moves on when no decision is sent (older app versions)", async () => {
    const { t, ids, asAthlete } = await setup({ completedInBlock: 0 });
    await asAthlete.mutation(api.userPrograms.completeReassessment, checkIn);
    const program = await t.run((ctx) => ctx.db.get(ids.programId));
    expect(program?.currentPhase).toBe("SPP");
  });

  // Sol review: a repeated block must not inherit the last run's completions
  it("after Repeat, the block's workouts are not done yet (regression)", async () => {
    const { asAthlete, ids } = await setup({ completedInBlock: 3 });

    // Before the check-in, every workout in the block is done
    const doneBefore = await asAthlete.query(api.gppWorkoutSessions.getCompletedTemplateIds, {});
    expect(doneBefore).toHaveLength(3);

    await asAthlete.mutation(api.userPrograms.completeReassessment, { ...checkIn, decision: "repeat" });

    // Today offers day 1 again, nothing in the block reads as done
    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    expect(today?._id).toBe(ids.templateIds[0]);
    expect(await asAthlete.query(api.gppWorkoutSessions.getCompletedTemplateIds, {})).toEqual([]);
    expect(
      await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, { templateId: ids.templateIds[0] })
    ).toBeNull();
  });

  it("after Move on, the finished phase's workouts stay done", async () => {
    const { asAthlete } = await setup({ completedInBlock: 3 });
    await asAthlete.mutation(api.userPrograms.completeReassessment, { ...checkIn, decision: "move_on" });
    expect(await asAthlete.query(api.gppWorkoutSessions.getCompletedTemplateIds, {})).toHaveLength(3);
  });

  // Greptile review on #120
  it("a redo doesn't stand in for a skipped workout", async () => {
    const { t, ids, asAthlete } = await setup({ completedInBlock: 2 });
    // Day 1 again, instead of day 3
    await t.run(async (ctx) => {
      const userId = (await ctx.db.get(ids.programId))!.userId;
      const at = Date.now() - 60 * 60 * 1000;
      await ctx.db.insert("gpp_workout_sessions", {
        userId,
        templateId: ids.templateIds[0],
        userProgramId: ids.programId,
        startedAt: at - 30 * 60 * 1000,
        completedAt: at,
        status: "completed",
        templateSnapshot: { name: "GPP day 1", phase: "GPP", week: 1, day: 1, workoutDate: at },
        exercises: [],
      });
    });
    const status = await asAthlete.query(api.userPrograms.getReassessmentStatus, {});
    expect(status?.completionStats).toMatchObject({ completed: 2, expected: 3 });
  });

  it("a new block drops today's pick and this phase's moved dates from the old block", async () => {
    const { t, ids, asAthlete } = await setup({ completedInBlock: 3 });
    const overrideId = await t.run(async (ctx) => {
      const userId = (await ctx.db.get(ids.programId))!.userId;
      return ctx.db.insert("user_schedule_overrides", {
        userId,
        userProgramId: ids.programId,
        todayFocusTemplateId: ids.templateIds[2],
        todayFocusSetAt: Date.now() - DAY,
        slotOverrides: [],
        dateOverrides: [{ phase: "GPP", week: 1, day: 3, dateISO: "2026-01-01" }],
        createdAt: Date.now() - DAY,
        updatedAt: Date.now() - DAY,
      });
    });
    await asAthlete.mutation(api.userPrograms.completeReassessment, { ...checkIn, decision: "repeat" });

    const override = await t.run((ctx) => ctx.db.get(overrideId));
    expect(override?.todayFocusTemplateId).toBeUndefined();
    expect(override?.dateOverrides).toEqual([]);
    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    expect(today?._id).toBe(ids.templateIds[0]);
  });

  it("after Repeat, the calendar runs the block again from its new start", async () => {
    const { asAthlete } = await setup({ completedInBlock: 3 });
    await asAthlete.mutation(api.userPrograms.completeReassessment, { ...checkIn, decision: "repeat" });

    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, {});
    const firstDate = Object.values(calendar!.calendarData).find((d) =>
      d.workouts.some((w) => w.phase === "GPP" && w.week === 1 && w.day === 1)
    )?.date;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayISO = startOfToday.toISOString().slice(0, 10);
    // On or after today, within a week, and not marked done
    expect(firstDate! >= todayISO || firstDate === todayISO).toBe(true);
    const daysOut = (new Date(firstDate! + "T00:00:00").getTime() - startOfToday.getTime()) / DAY;
    expect(daysOut).toBeLessThan(7);
    const entry = calendar!.calendarData[firstDate!].workouts.find((w) => w.phase === "GPP" && w.week === 1 && w.day === 1);
    expect(entry?.isCompleted).toBe(false);
  });

  // Greptile review on #120: moving on late must not move past workouts
  it("after a late Move on, past GPP keeps its dates and SPP starts now", async () => {
    const { t, asAthlete } = await setup({ completedInBlock: 3 });
    await t.run(async (ctx) => {
      await ctx.db.insert("program_templates", {
        gppCategoryId: 2,
        phase: "SPP",
        skillLevel: "Novice",
        week: 1,
        day: 1,
        name: "SPP day 1",
        estimatedDurationMinutes: 30,
        exercises: [],
      });
    });
    // "Challenging" keeps the skill level, so the Novice templates still apply
    await asAthlete.mutation(api.userPrograms.completeReassessment, {
      phaseDifficulty: "challenging",
      maxesUpdated: false,
      decision: "move_on",
    });

    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, {});
    const dateOf = (phase: string) =>
      Object.values(calendar!.calendarData).find((d) =>
        d.workouts.some((w) => w.phase === phase && w.week === 1 && w.day === 1)
      )!.date;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const daysFromToday = (iso: string) =>
      Math.round((new Date(iso + "T00:00:00").getTime() - startOfToday.getTime()) / DAY);

    // The program was created 30 days ago: GPP stays there
    expect(daysFromToday(dateOf("GPP"))).toBeGreaterThanOrEqual(-30);
    expect(daysFromToday(dateOf("GPP"))).toBeLessThan(-23);
    // SPP starts on the next training day
    expect(daysFromToday(dateOf("SPP"))).toBeGreaterThanOrEqual(0);
    expect(daysFromToday(dateOf("SPP"))).toBeLessThan(7);
  });
});
