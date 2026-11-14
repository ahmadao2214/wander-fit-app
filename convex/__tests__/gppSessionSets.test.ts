import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { convexModules } from "../../jest/convexModules";

const modules = convexModules();

const set = (completed: boolean) => ({ completed, skipped: false, repsCompleted: completed ? 12 : undefined });

/** A user with a program, a template built from `shape`, and a saved in-progress session. */
type ExerciseIds = { goblet: Id<"exercises">; rdl: Id<"exercises">; deadBug: Id<"exercises"> };
type SessionShape = {
  templateExercises: (ids: ExerciseIds) => { exerciseId: Id<"exercises">; sets: number; section?: "warmup" | "main" }[];
  saved: (ids: ExerciseIds) => { exerciseId: Id<"exercises">; completed: boolean; skipped: boolean; sets: ReturnType<typeof set>[] }[];
  exerciseOrder?: number[];
};

async function setupSession(shape: SessionShape) {
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
    const sportId = await ctx.db.insert("sports", { name: "Basketball", gppCategoryId: 2 });
    const intakeResponseId = await ctx.db.insert("intake_responses", {
      userId,
      sportId,
      yearsOfExperience: 2,
      preferredTrainingDaysPerWeek: 3,
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
    });
    const goblet = await ctx.db.insert("exercises", { name: "Goblet Squat", slug: "goblet_squat", tags: ["squat"] });
    const rdl = await ctx.db.insert("exercises", { name: "Romanian Deadlift", slug: "romanian_deadlift", tags: ["hinge"] });
    const deadBug = await ctx.db.insert("exercises", { name: "Dead Bug", slug: "dead_bug", tags: ["core"] });
    const exerciseIds = { goblet, rdl, deadBug };
    const templateId = await ctx.db.insert("program_templates", {
      gppCategoryId: 2,
      phase: "GPP",
      skillLevel: "Moderate",
      week: 1,
      day: 1,
      name: "Lower Body Foundation",
      estimatedDurationMinutes: 40,
      exercises: shape.templateExercises(exerciseIds).map((ex, orderIndex) => ({
        ...ex,
        reps: "10",
        restSeconds: 60,
        orderIndex,
      })),
    });
    const sessionId = await ctx.db.insert("gpp_workout_sessions", {
      userId,
      templateId,
      userProgramId,
      startedAt: now,
      status: "in_progress",
      exerciseOrder: shape.exerciseOrder,
      exercises: shape.saved(exerciseIds),
    });
    return { ...exerciseIds, sessionId };
  });
  return { t, ids, asAthlete: t.withIdentity({ subject: "clerk_athlete", email: "athlete@example.com" }) };
}

/**
 * A session saved by builds that reordered completions: Romanian Deadlift's
 * slot holds Goblet Squat's six sets, with sets 4-6 logged.
 */
function setupScrambledSession() {
  return setupSession({
    templateExercises: ({ goblet, rdl }) => [
      { exerciseId: goblet, sets: 6 },
      { exerciseId: rdl, sets: 3 },
    ],
    exerciseOrder: [1, 0],
    saved: ({ goblet, rdl }) => [
      // Goblet Squat's slot holds Romanian Deadlift's sets
      { exerciseId: rdl, completed: false, skipped: false, sets: [set(false), set(false), set(false)] },
      // Romanian Deadlift's slot holds Goblet Squat's six sets, 4-6 logged
      {
        exerciseId: goblet,
        completed: false,
        skipped: false,
        sets: [set(false), set(false), set(false), set(true), set(true), set(true)],
      },
    ],
  });
}

describe("gppWorkoutSessions.getById set normalization", () => {
  it("returns each record in its own exercise's slot, sized to that exercise", async () => {
    const { asAthlete, ids } = await setupScrambledSession();
    const session = await asAthlete.query(api.gppWorkoutSessions.getById, { sessionId: ids.sessionId });
    expect(session!.exercises.map((e) => [e.exerciseId, e.sets.length])).toEqual([
      [ids.goblet, 6],
      [ids.rdl, 3],
    ]);
    expect(session!.exercises[0].sets.map((s) => s.completed)).toEqual([false, false, false, true, true, true]);
  });

  it("keeps a main-only save on the main exercise when a warmup shares its exerciseId", async () => {
    const { asAthlete, ids } = await setupSession({
      templateExercises: ({ goblet, deadBug }) => [
        { exerciseId: deadBug, sets: 1, section: "warmup" },
        { exerciseId: goblet, sets: 3, section: "main" },
        { exerciseId: deadBug, sets: 2, section: "main" },
      ],
      saved: ({ goblet, deadBug }) => [
        { exerciseId: goblet, completed: false, skipped: false, sets: [set(true), set(false), set(false)] },
        { exerciseId: deadBug, completed: true, skipped: false, sets: [set(true), set(true)] },
      ],
    });
    const session = await asAthlete.query(api.gppWorkoutSessions.getById, { sessionId: ids.sessionId });
    const [warmup, goblet, mainDeadBug] = session!.exercises;
    expect(warmup).toMatchObject({ exerciseId: ids.deadBug, completed: true, skipped: true });
    expect(goblet.sets.map((s) => s.completed)).toEqual([true, false, false]);
    expect(mainDeadBug).toMatchObject({ exerciseId: ids.deadBug, completed: true });
    expect(mainDeadBug.sets.map((s) => s.completed)).toEqual([true, true]);
  });

  it("keeps logged sets that sit past the prescription of the slot they were saved in", async () => {
    const { asAthlete, ids } = await setupScrambledSession();
    const session = await asAthlete.query(api.gppWorkoutSessions.getById, { sessionId: ids.sessionId });
    const goblet = session!.exercises.find((e) => e.exerciseId === ids.goblet)!;
    expect(goblet.sets.filter((s) => s.completed)).toHaveLength(3);
  });
});
