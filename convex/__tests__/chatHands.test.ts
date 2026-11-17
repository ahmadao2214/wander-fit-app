import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

async function fixture() {
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
      exercises: [prescription(squat, 0), prescription(hinge, 1)],
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
    return { dayOne, dayTwo, squat, hinge, sessionId };
  });

  const asAthlete = t.withIdentity({
    subject: "clerk_athlete",
    email: "athlete@example.com",
  });
  return { t, asAthlete, ...ids };
}

describe("chat hands", () => {
  it("does not offer an easier or harder write", async () => {
    const { asAthlete } = await fixture();
    const listed = await asAthlete.query(api.chatHands.listTools, {});
    expect(listed.omittedWrites).toEqual(["easier_or_harder"]);
    expect(listed.tools).not.toContain("easier_or_harder");
  });

  it("reads today as the same exercises the app returns", async () => {
    const { asAthlete, dayOne, squat, hinge } = await fixture();
    const screen = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    const tool = await asAthlete.action(api.chatHands.readToday, {});

    expect(screen?._id).toBe(dayOne);
    expect(tool.templateId).toBe(screen?._id);
    expect(tool.exerciseIds).toEqual([squat, hinge]);
    expect(tool.exerciseIds).toEqual(
      screen?.exercises.map((row: { exerciseId: typeof squat }) => row.exerciseId),
    );
  });

  it("writes a reorder only after acceptance, and refuses a stale one", async () => {
    const { asAthlete, sessionId, squat, hinge } = await fixture();
    const preview = await asAthlete.query(api.chatHands.previewReorder, {
      sessionId,
      exerciseOrder: [1, 0],
    });
    expect(preview.valid).toBe(true);
    expect(preview.exerciseIds).toEqual([hinge, squat]);

    const before = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: (await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {}))!._id,
    });
    expect(before?.exerciseOrder).toBeUndefined();

    const declined = await asAthlete.mutation(api.chatHands.commitReorder, {
      sessionId,
      exerciseOrder: [1, 0],
      version: preview.version!,
      accepted: false,
    });
    expect(declined).toEqual({ written: false, reason: "not_accepted" });

    const accepted = await asAthlete.mutation(api.chatHands.commitReorder, {
      sessionId,
      exerciseOrder: [1, 0],
      version: preview.version!,
      accepted: true,
    });
    expect(accepted).toEqual({ written: true, reason: "ok" });

    const today = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    const screen = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: today!._id,
    });
    expect(screen?.exerciseOrder).toEqual([1, 0]);

    const stale = await asAthlete.mutation(api.chatHands.commitReorder, {
      sessionId,
      exerciseOrder: [0, 1],
      version: preview.version!,
      accepted: true,
    });
    expect(stale).toEqual({ written: false, reason: "stale" });
    const after = await asAthlete.query(api.gppWorkoutSessions.getSessionForTemplate, {
      templateId: today!._id,
    });
    expect(after?.exerciseOrder).toEqual([1, 0]);
  });

  it("swaps two days only after acceptance, and refuses a stale swap", async () => {
    const { asAthlete } = await fixture();
    const slotA = { phase: "GPP" as const, week: 1, day: 1 };
    const slotB = { phase: "GPP" as const, week: 1, day: 2 };
    const preview = await asAthlete.query(api.chatHands.previewSwap, { slotA, slotB });
    expect(preview.dayA).toBe("Upper Body");
    expect(preview.dayB).toBe("Lower Body");

    const declined = await asAthlete.mutation(api.chatHands.commitSwap, {
      slotA,
      slotB,
      version: preview.version!,
      accepted: false,
    });
    expect(declined.written).toBe(false);

    const dayBefore = await asAthlete.query(api.chatHands.readDay, { slot: slotA });
    expect(dayBefore.name).toBe("Lower Body");

    const accepted = await asAthlete.mutation(api.chatHands.commitSwap, {
      slotA,
      slotB,
      version: preview.version!,
      accepted: true,
    });
    expect(accepted).toEqual({ written: true, reason: "ok" });

    const dayAfter = await asAthlete.query(api.chatHands.readDay, { slot: slotA });
    expect(dayAfter.name).toBe("Upper Body");

    const stale = await asAthlete.mutation(api.chatHands.commitSwap, {
      slotA,
      slotB,
      version: preview.version!,
      accepted: true,
    });
    expect(stale).toEqual({ written: false, reason: "stale" });
    const still = await asAthlete.query(api.chatHands.readDay, { slot: slotA });
    expect(still.name).toBe("Upper Body");
  });

  it("does not read a locked phase", async () => {
    const { asAthlete } = await fixture();
    const day = await asAthlete.query(api.chatHands.readDay, {
      slot: { phase: "SPP", week: 1, day: 1 },
    });
    expect(day.locked).toBe(true);
    expect(day.exerciseIds).toEqual([]);
  });

  it("says there is no program before intake", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "new@example.com",
        name: "New",
        clerkId: "clerk_new",
        createdAt: Date.now(),
      });
    });
    const asNew = t.withIdentity({ subject: "clerk_new", email: "new@example.com" });
    expect(await asNew.query(api.chatHands.readProgram, {})).toBeNull();
    const today = await asNew.action(api.chatHands.readToday, {});
    expect(today.templateId).toBeNull();
  });
});
