import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";
import type { Id } from "../_generated/dataModel";

const modules = convexModules();
const DAY = 86_400_000;

/**
 * An athlete in a 5-week GPP phase, two workouts a week, with the week-1 and
 * week-2 workouts done. In a 5-week phase user weeks 2 and 3 both use the
 * week-2 templates.
 */
async function setup(position: { currentWeek: number; currentDay: number }) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert("users", {
      email: "a@example.com", name: "A", clerkId: "clerk_a", role: "client", createdAt: now, intakeCompletedAt: now,
    });
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId, sportId, yearsOfExperience: 2, preferredTrainingDaysPerWeek: 2,
      assignedGppCategoryId: 2, assignedSkillLevel: "Moderate", intakeType: "initial", completedAt: now,
    });
    const programId = await ctx.db.insert("user_programs", {
      userId, intakeResponseId, gppCategoryId: 2, skillLevel: "Moderate",
      currentPhase: "GPP", ...position, weeksPerPhase: 5,
      phaseStartDate: now - 30 * DAY, createdAt: now - 30 * DAY, updatedAt: now,
    });
    const exerciseId = await ctx.db.insert("exercises", { name: "Goblet Squat", slug: "goblet_squat", tags: ["squat"] });
    const templates: Record<string, Id<"program_templates">> = {};
    for (let week = 1; week <= 4; week++) {
      for (let day = 1; day <= 2; day++) {
        const name = `W${week}D${day}`;
        templates[name] = await ctx.db.insert("program_templates", {
          gppCategoryId: 2, phase: "GPP", skillLevel: "Moderate", week, day, name, estimatedDurationMinutes: 30,
          exercises: [{ exerciseId, sets: 1, reps: "10", restSeconds: 60, orderIndex: 0, section: "main" as const }],
        });
        if (week <= 2) {
          const doneAt = now - (10 - week * 2 - day) * DAY;
          await ctx.db.insert("gpp_workout_sessions", {
            userId, templateId: templates[name], userProgramId: programId,
            startedAt: doneAt, completedAt: doneAt, status: "completed",
            templateSnapshot: { name, phase: "GPP", week, day, workoutDate: doneAt },
            exercises: [{ exerciseId, completed: true, skipped: false, sets: [{ completed: true, skipped: false, repsCompleted: 10 }] }],
          });
        }
      }
    }
    return { programId, templates };
  });
  return { t, ids, asAthlete: t.withIdentity({ subject: "clerk_a", email: "a@example.com" }) };
}

describe("a 5-week phase repeats the week-2 workouts", () => {
  it("in week 3, Today offers W2D1 as not done yet (regression)", async () => {
    const { ids, asAthlete } = await setup({ currentWeek: 3, currentDay: 1 });
    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    expect(today?.name).toBe("W2D1");
    // The detail screen and the Today card read this to show Completed / Redo
    const session = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: ids.templates.W2D1,
    });
    expect(session).toBeNull();
  });

  it("the calendar marks W2D1 done in week 2 only, with week 2's date (regression)", async () => {
    const { asAthlete } = await setup({ currentWeek: 3, currentDay: 1 });
    const calendar = await asAthlete.query(api.workoutCalendar.getFullProgramCalendar, {});
    // The calendar also shows a finished workout on the day it was done; this
    // looks only at the program's own slots (the dates it was planned for)
    const slot = (week: number) =>
      Object.entries(calendar!.calendarData)
        .flatMap(([date, d]) => d.workouts.map((w) => ({ ...w, date })))
        .find((w) => w.phase === "GPP" && w.name === "W2D1" && w.week === week && w.date !== w.completedOnDate);
    expect(slot(3)?.isCompleted).toBe(false);
    expect(slot(3)?.completedOnDate).toBeUndefined();
    const weekTwo = Object.values(calendar!.calendarData)
      .flatMap((d) => d.workouts)
      .filter((w) => w.name === "W2D1" && w.week === 2);
    expect(weekTwo.length > 0 && weekTwo.every((w) => w.isCompleted)).toBe(true);
  });

  it("in week 2, the same workout is done", async () => {
    const { ids, asAthlete } = await setup({ currentWeek: 2, currentDay: 2 });
    const session = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: ids.templates.W2D1,
    });
    expect(session?.status).toBe("completed");
  });

  it("starting W2D1 in week 3 is not a Redo, and completing it moves the program on", async () => {
    const { ids, t, asAthlete } = await setup({ currentWeek: 3, currentDay: 1 });
    const { sessionId } = await asAthlete.mutation(api.gppWorkoutSessions.startSession, {
      templateId: ids.templates.W2D1, skipCascade: true,
    });
    const started = await t.run((ctx) => ctx.db.get(sessionId));
    expect(started?.redo).toBeUndefined();
    await asAthlete.mutation(api.gppWorkoutSessions.completeSession, { sessionId, exercises: started!.exercises });
    const result = await asAthlete.mutation(api.userPrograms.advanceToNextDay, { programId: ids.programId });
    expect(result.advanced).toBe(true);
    expect(result.currentDay).toBe(2);
  });
});

describe("Redo", () => {
  it("doing a finished workout again doesn't move the program on (regression)", async () => {
    const { ids, t, asAthlete } = await setup({ currentWeek: 2, currentDay: 2 });
    const { sessionId } = await asAthlete.mutation(api.gppWorkoutSessions.startSession, {
      templateId: ids.templates.W2D1, skipCascade: true,
    });
    const started = await t.run((ctx) => ctx.db.get(sessionId));
    expect(started?.redo).toBe(true);

    await asAthlete.mutation(api.gppWorkoutSessions.completeSession, { sessionId, exercises: started!.exercises });
    const result = await asAthlete.mutation(api.userPrograms.advanceToNextDay, { programId: ids.programId });
    expect(result.advanced).toBe(false);

    const program = await t.run((ctx) => ctx.db.get(ids.programId));
    expect({ week: program?.currentWeek, day: program?.currentDay }).toEqual({ week: 2, day: 2 });
  });

  it("a Redo doesn't fill the next slot that repeats the workout", async () => {
    const { ids, t, asAthlete } = await setup({ currentWeek: 2, currentDay: 2 });
    const { sessionId } = await asAthlete.mutation(api.gppWorkoutSessions.startSession, {
      templateId: ids.templates.W2D1, skipCascade: true,
    });
    const started = await t.run((ctx) => ctx.db.get(sessionId));
    await asAthlete.mutation(api.gppWorkoutSessions.completeSession, { sessionId, exercises: started!.exercises });

    // Move to week 3: W2D1 is due again and still not done there
    await t.run((ctx) => ctx.db.patch(ids.programId, { currentWeek: 3, currentDay: 1 }));
    const session = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: ids.templates.W2D1,
    });
    expect(session).toBeNull();
  });
});
