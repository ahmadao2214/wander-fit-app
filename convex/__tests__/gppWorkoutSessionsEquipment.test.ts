// @vitest-environment edge-runtime
/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { resolveSessionExerciseIds } from "../gppWorkoutSessions";

const modules = import.meta.glob("../**/*.ts");

async function setup(storedMode?: "gym" | "home") {
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
    const sportId = await ctx.db.insert("sports", { name: "Soccer", gppCategoryId: 4 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek: 3,
      assignedGppCategoryId: 4,
      assignedSkillLevel: "Moderate",
      intakeType: "initial",
      completedAt: now,
    });
    await ctx.db.insert("user_programs", {
      userId,
      intakeResponseId,
      gppCategoryId: 4,
      skillLevel: "Moderate",
      currentPhase: "GPP",
      currentWeek: 1,
      currentDay: 1,
      phaseStartDate: now,
      equipmentMode: storedMode,
      createdAt: now,
      updatedAt: now,
    });

    const benchPress = await ctx.db.insert("exercises", {
      name: "Bench Press",
      slug: "bench_press",
      tags: ["upper_body", "push", "horizontal", "strength", "bilateral"],
      equipment: ["barbell", "bench", "rack"],
      difficulty: "intermediate",
    });
    const pushUp = await ctx.db.insert("exercises", {
      name: "Push-Up",
      slug: "push_up",
      tags: ["upper_body", "push", "horizontal", "strength", "bodyweight"],
      equipment: ["bodyweight"],
      difficulty: "beginner",
    });
    const medBallPass = await ctx.db.insert("exercises", {
      name: "Med Ball Chest Pass",
      slug: "med_ball_chest_pass_warmup",
      tags: ["upper_body", "warmup", "power", "push", "chest"],
      equipment: ["medicine_ball", "wall"],
      difficulty: "beginner",
    });

    const templateId = await ctx.db.insert("program_templates", {
      gppCategoryId: 4,
      phase: "GPP",
      skillLevel: "Moderate",
      week: 1,
      day: 1,
      name: "Upper Push/Pull",
      estimatedDurationMinutes: 45,
      exercises: [
        { exerciseId: medBallPass, sets: 2, reps: "5", restSeconds: 30, orderIndex: 0, section: "warmup" },
        { exerciseId: benchPress, sets: 3, reps: "5", restSeconds: 120, orderIndex: 1, section: "main" },
      ],
    });

    return { userId, templateId, benchPress, pushUp, medBallPass };
  });

  return { t, ids, asAthlete: t.withIdentity({ subject: "clerk_athlete" }) };
}

async function startAndLoad(storedMode?: "gym" | "home", requestedMode?: "gym" | "home") {
  const ctx = await setup(storedMode);
  const { sessionId } = await ctx.asAthlete.mutation(api.gppWorkoutSessions.startSession, {
    templateId: ctx.ids.templateId,
    skipCascade: true,
    equipmentMode: requestedMode,
  });
  const session = await ctx.asAthlete.query(api.gppWorkoutSessions.getById, {
    sessionId: sessionId as Id<"gpp_workout_sessions">,
  });
  const stored = await ctx.t.run((db) => db.db.get(sessionId as Id<"gpp_workout_sessions">));
  return { ...ctx, session: session!, stored: stored! };
}

describe("gppWorkoutSessions equipment carry-over", () => {
  it("records the home swap in the session's exercises", async () => {
    const { ids, stored } = await startAndLoad("home");

    expect(stored.equipmentMode).toBe("home");
    expect(stored.exercises.map((e) => e.exerciseId)).toEqual([ids.medBallPass, ids.pushUp]);
    expect(stored.activeExerciseIds).toEqual([ids.medBallPass, ids.pushUp]);
  });

  it("serves the swapped exercise from getById, keeping the source for display", async () => {
    const { ids, session } = await startAndLoad("home");
    const [warmup, main] = session.template!.exercises as any[];

    expect(warmup.exercise.slug).toBe("med_ball_chest_pass_warmup");
    expect(warmup.isEquipmentSwapped).toBe(false);

    expect(main.exercise.slug).toBe("push_up");
    expect(main.exerciseId).toBe(ids.pushUp);
    expect(main.sourceExercise.slug).toBe("bench_press");
    expect(main.sourceExerciseId).toBe(ids.benchPress);
    expect(main.isEquipmentSwapped).toBe(true);
    expect(main.isBodyweight).toBe(true);
  });

  it("prefers the mode passed to startSession over the stored preference", async () => {
    const { ids, stored } = await startAndLoad("gym", "home");
    expect(stored.exercises[1].exerciseId).toBe(ids.pushUp);
  });

  it("keeps the template exercises in gym mode", async () => {
    const { ids, stored, session } = await startAndLoad(undefined);
    const main = (session.template!.exercises as any[])[1];

    expect(stored.equipmentMode).toBe("gym");
    expect(stored.exercises.map((e) => e.exerciseId)).toEqual([ids.medBallPass, ids.benchPress]);
    expect(main.exercise.slug).toBe("bench_press");
    expect(main.isEquipmentSwapped).toBe(false);
  });

  it("keeps the swap stable when the stored preference changes mid-session", async () => {
    const { t, ids, asAthlete, stored } = await startAndLoad("home");
    await t.run(async (db) => {
      const program = await db.db
        .query("user_programs")
        .withIndex("by_user", (q) => q.eq("userId", ids.userId))
        .first();
      await db.db.patch(program!._id, { equipmentMode: "gym" });
    });

    const session = await asAthlete.query(api.gppWorkoutSessions.getById, { sessionId: stored._id });
    expect((session!.template!.exercises as any[])[1].exercise.slug).toBe("push_up");
  });
});

describe("resolveSessionExerciseIds", () => {
  const template = [{ exerciseId: "a" }, { exerciseId: "b" }] as any[];

  it("uses the session snapshot when it lines up with the template", () => {
    expect(resolveSessionExerciseIds(template, ["a", "c"] as any[])).toEqual(["a", "c"]);
  });

  it("falls back to the template for sessions without a snapshot", () => {
    expect(resolveSessionExerciseIds(template, undefined)).toEqual(["a", "b"]);
  });

  it("falls back to the template when the snapshot is out of step with it", () => {
    expect(resolveSessionExerciseIds(template, ["c"] as any[])).toEqual(["a", "b"]);
  });
});
