import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";
import type { Id } from "../_generated/dataModel";
import { athleteDate, athleteToday, isoDate } from "../athleteClock";

const modules = convexModules();
const DAY = 86_400_000;
const MINUTE = 60_000;

/**
 * An athlete whose day is a full day behind the server's. A real offset is
 * at most 14 hours, so whether it crosses midnight depends on the hour; a
 * whole day makes the case the same at any hour, and the math is the same.
 */
const behind = () => {
  const timezoneOffsetMinutes = new Date().getTimezoneOffset() + 24 * 60;
  return { timezoneOffsetMinutes, today: isoDate(athleteToday({ timezoneOffsetMinutes })) };
};
const serverDay = () => ({ today: isoDate(athleteToday({})) });

/** GPP week 1 day 1, training every day, templates for weeks 1-4 days 1-7. */
async function setup() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: "a@example.com", name: "A", clerkId: "clerk_a", role: "client", createdAt: now, intakeCompletedAt: now,
    });
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId, sportId, yearsOfExperience: 2, preferredTrainingDaysPerWeek: 7, selectedTrainingDays: [0, 1, 2, 3, 4, 5, 6],
      assignedGppCategoryId: 2, assignedSkillLevel: "Moderate", intakeType: "initial", completedAt: now,
    });
    const programId = await ctx.db.insert("user_programs", {
      userId, intakeResponseId, gppCategoryId: 2, skillLevel: "Moderate",
      currentPhase: "GPP", currentWeek: 1, currentDay: 1, weeksPerPhase: 4,
      // Started three days ago, so the days around today all have workouts
      phaseStartDate: now - 3 * DAY, createdAt: now - 3 * DAY, updatedAt: now,
    });
    const exerciseId = await ctx.db.insert("exercises", { name: "Goblet Squat", slug: "goblet_squat", tags: ["squat"] });
    const templates: Record<string, Id<"program_templates">> = {};
    for (let week = 1; week <= 4; week++) {
      for (let day = 1; day <= 7; day++) {
        templates[`W${week}D${day}`] = await ctx.db.insert("program_templates", {
          gppCategoryId: 2, phase: "GPP", skillLevel: "Moderate", week, day, name: `W${week}D${day}`, estimatedDurationMinutes: 30,
          exercises: [{ exerciseId, sets: 1, reps: "10", restSeconds: 60, orderIndex: 0, section: "main" as const }],
        });
      }
    }
    return { userId, programId, templates };
  });
  return { t, ids, asAthlete: t.withIdentity({ subject: "clerk_a", email: "a@example.com" }) };
}

describe("athleteClock", () => {
  it("reads a timestamp on the athlete's wall clock", () => {
    const ts = Date.UTC(2026, 10, 22, 3, 30); // 03:30 UTC is 19:30 the day before in UTC-8
    const local = athleteDate(ts, { timezoneOffsetMinutes: 8 * 60 });
    expect([local.getDate(), local.getHours(), local.getMinutes()]).toEqual([21, 19, 30]);
    expect(athleteDate(ts, {}).getTime()).toBe(ts);
  });

  it("takes the athlete's date when it is sent", () => {
    expect(isoDate(athleteToday({ today: "2026-11-21", timezoneOffsetMinutes: 480 }))).toBe("2026-11-21");
  });
});

describe("a Today pick lasts for the day it was picked", () => {
  it("is Today's workout on that day", async () => {
    const { ids, asAthlete } = await setup();
    await asAthlete.mutation(api.scheduleOverrides.setTodayFocus, { templateId: ids.templates.W1D3 });
    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, serverDay());
    expect(today?.name).toBe("W1D3");
  });

  it("goes back to the program the next day (regression: it never cleared)", async () => {
    const { ids, t, asAthlete } = await setup();
    await asAthlete.mutation(api.scheduleOverrides.setTodayFocus, { templateId: ids.templates.W1D3 });
    // Picked yesterday
    await t.run(async (ctx) => {
      const record = await ctx.db.query("user_schedule_overrides").first();
      await ctx.db.patch(record!._id, { todayFocusSetAt: Date.now() - DAY });
    });
    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, serverDay());
    expect(today?.name).toBe("W1D1");
    // Builds that send no day still get the server's day
    expect((await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {}))?.name).toBe("W1D1");
  });

  it("ends at the athlete's midnight, not the server's", async () => {
    const { ids, t, asAthlete } = await setup();
    await asAthlete.mutation(api.scheduleOverrides.setTodayFocus, { templateId: ids.templates.W1D3 });
    // Twelve hours behind the server
    const timezoneOffsetMinutes = new Date().getTimezoneOffset() + 12 * 60;
    const day = { timezoneOffsetMinutes, today: isoDate(athleteToday({ timezoneOffsetMinutes })) };
    // The real time of a wall-clock moment on the athlete's clock
    const real = (wall: number) => wall - (new Date(wall).getTimezoneOffset() - timezoneOffsetMinutes) * MINUTE;
    const midnight = athleteToday(day).getTime();
    const pickedAt = async (ts: number) => {
      await t.run(async (ctx) => {
        const record = await ctx.db.query("user_schedule_overrides").first();
        await ctx.db.patch(record!._id, { todayFocusSetAt: ts });
      });
      return (await asAthlete.query(api.scheduleOverrides.getTodayWorkout, day))?.name;
    };
    expect(await pickedAt(real(midnight + MINUTE))).toBe("W1D3");
    expect(await pickedAt(real(midnight - MINUTE))).toBe("W1D1");
  });
});

describe("a workout moved onto today on the calendar", () => {
  it("is Today's workout (regression: Today ignored calendar moves)", async () => {
    const { ids, t, asAthlete } = await setup();
    await t.run((ctx) =>
      ctx.db.insert("user_schedule_overrides", {
        userId: ids.userId, userProgramId: ids.programId, slotOverrides: [],
        dateOverrides: [{ phase: "GPP", week: 1, day: 4, dateISO: serverDay().today }],
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );
    expect((await asAthlete.query(api.scheduleOverrides.getTodayWorkout, serverDay()))?.name).toBe("W1D4");
  });

  it("starting it doesn't reshuffle it back off today (regression)", async () => {
    const { ids, t, asAthlete } = await setup();
    // Today is week 1 day 4 by the calendar; day 6 was moved onto today
    await t.run((ctx) =>
      ctx.db.insert("user_schedule_overrides", {
        userId: ids.userId, userProgramId: ids.programId, slotOverrides: [],
        dateOverrides: [{ phase: "GPP", week: 1, day: 6, dateISO: serverDay().today }],
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );
    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, serverDay());
    expect(today?.name).toBe("W1D6");

    const started = await asAthlete.mutation(api.gppWorkoutSessions.startSession, { ...serverDay(), templateId: today!._id });
    expect(started.cascadeApplied).toBe(false);
    const record = await t.run((ctx) => ctx.db.query("user_schedule_overrides").first());
    expect(record?.slotOverrides).toEqual([]);
  });

  it("once done, it no longer stands in for today's slot when another workout starts", async () => {
    const { ids, t, asAthlete } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("user_schedule_overrides", {
        userId: ids.userId, userProgramId: ids.programId, slotOverrides: [],
        dateOverrides: [{ phase: "GPP", week: 1, day: 6, dateISO: serverDay().today }],
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      await ctx.db.insert("gpp_workout_sessions", {
        userId: ids.userId, templateId: ids.templates.W1D6, userProgramId: ids.programId,
        startedAt: Date.now(), completedAt: Date.now(), status: "completed",
        templateSnapshot: { name: "W1D6", phase: "GPP", week: 1, day: 6, workoutDate: Date.now() },
        exercises: [],
      });
    });
    // Today's slot is the calendar's (day 4) again, so starting day 5 reshuffles from there
    const started = await asAthlete.mutation(api.gppWorkoutSessions.startSession, {
      ...serverDay(), templateId: ids.templates.W1D5,
    });
    expect(started.cascadeApplied).toBe(true);
  });

  it("starting a later workout doesn't undo the move either (regression)", async () => {
    const { ids, t, asAthlete } = await setup();
    // Days 3, 4 and 5 are yesterday, today and tomorrow. Day 3 was moved onto
    // today, which swapped day 4 onto yesterday.
    const today = serverDay().today;
    const yesterday = isoDate(new Date(athleteToday({}).getTime() - DAY + 12 * 60 * MINUTE));
    await t.run((ctx) =>
      ctx.db.insert("user_schedule_overrides", {
        userId: ids.userId, userProgramId: ids.programId, slotOverrides: [],
        dateOverrides: [
          { phase: "GPP", week: 1, day: 3, dateISO: today },
          { phase: "GPP", week: 1, day: 4, dateISO: yesterday },
        ],
        createdAt: Date.now(), updatedAt: Date.now(),
      }),
    );
    // Starting day 5 early used to shuffle the slots in order, putting day 3
    // back on yesterday
    const started = await asAthlete.mutation(api.gppWorkoutSessions.startSession, {
      ...serverDay(), templateId: ids.templates.W1D5,
    });
    expect(started.cascadeApplied).toBe(false);
    const record = await t.run((ctx) => ctx.db.query("user_schedule_overrides").first());
    expect(record?.slotOverrides).toEqual([]);
  });

  it("is not offered once it is done", async () => {
    const { ids, t, asAthlete } = await setup();
    await t.run(async (ctx) => {
      await ctx.db.insert("user_schedule_overrides", {
        userId: ids.userId, userProgramId: ids.programId, slotOverrides: [],
        dateOverrides: [{ phase: "GPP", week: 1, day: 4, dateISO: serverDay().today }],
        createdAt: Date.now(), updatedAt: Date.now(),
      });
      await ctx.db.insert("gpp_workout_sessions", {
        userId: ids.userId, templateId: ids.templates.W1D4, userProgramId: ids.programId,
        startedAt: Date.now(), completedAt: Date.now(), status: "completed",
        templateSnapshot: { name: "W1D4", phase: "GPP", week: 1, day: 4, workoutDate: Date.now() },
        exercises: [],
      });
    });
    expect((await asAthlete.query(api.scheduleOverrides.getTodayWorkout, serverDay()))?.name).toBe("W1D1");
  });
});

describe("the calendar on the athlete's day", () => {
  it("marks the athlete's today, not the server's", async () => {
    const { asAthlete } = await setup();
    const day = behind();
    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, day);
    const todays = Object.entries(calendar!.calendarData)
      .filter(([, d]) => d.workouts.some((w) => w.isToday))
      .map(([date]) => date);
    expect(todays).toEqual([day.today]);
  });

  it("lets a workout move onto the athlete's today (regression: refused as a past date)", async () => {
    const { asAthlete } = await setup();
    const day = behind();
    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, day);
    // Another day of the athlete's week (moves stay in the week) moves onto today
    const todayDate = athleteToday(day);
    const other = isoDate(new Date(todayDate.getTime() + (todayDate.getDay() === 6 ? -1 : 1) * DAY + 12 * 60 * MINUTE));
    const source = calendar!.calendarData[other].workouts[0];
    const result = await asAthlete.mutation(api.workoutCalendar.moveWorkoutToDate, {
      ...day,
      sourcePhase: "GPP",
      sourceWeek: source.week,
      sourceDay: source.day,
      targetDateISO: day.today,
    });
    expect(result.success).toBe(true);
  });

  it("dates a finished workout by the athlete's day, on its card and in history alike", async () => {
    const { ids, t, asAthlete } = await setup();
    const doneAt = Date.now() - 60 * MINUTE;
    await t.run((ctx) =>
      ctx.db.insert("gpp_workout_sessions", {
        userId: ids.userId, templateId: ids.templates.W1D1, userProgramId: ids.programId,
        startedAt: doneAt - 30 * MINUTE, completedAt: doneAt, status: "completed",
        templateSnapshot: { name: "W1D1", phase: "GPP", week: 1, day: 1, workoutDate: doneAt },
        exercises: [],
      }),
    );
    const day = behind();
    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, day);
    const dates = Object.values(calendar!.calendarData)
      .flatMap((d) => d.workouts)
      .filter((w) => w.name === "W1D1" && w.week === 1 && w.isCompleted)
      .map((w) => w.completedOnDate);
    expect(new Set(dates)).toEqual(new Set([isoDate(athleteDate(doneAt, day))]));
  });
});
