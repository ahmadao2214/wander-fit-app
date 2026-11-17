import { action, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireCurrentUser } from "./authHelpers";
import { writeExerciseOrder } from "./gppWorkoutSessions";
import { applyWorkoutSwap, resolveSlotPair } from "./scheduleOverrides";
import type { WorkoutSlotRef } from "./scheduleOverrides";
import {
  OMITTED_WRITES,
  TOOL_NAMES,
  isPermutation,
  reorderVersion,
  swapVersion,
} from "./chatHandsVersion";

const phaseValidator = v.union(
  v.literal("GPP"),
  v.literal("SPP"),
  v.literal("SSP"),
);

const slotValidator = v.object({
  phase: phaseValidator,
  week: v.number(),
  day: v.number(),
});

const writeResult = v.object({
  written: v.boolean(),
  reason: v.union(
    v.literal("ok"),
    v.literal("not_accepted"),
    v.literal("stale"),
    v.literal("no_session"),
    v.literal("bad_order"),
    v.literal("locked"),
  ),
});

function unlockedPhases(program: Doc<"user_programs">): Array<"GPP" | "SPP" | "SSP"> {
  const phases: Array<"GPP" | "SPP" | "SSP"> = ["GPP"];
  if (program.sppUnlockedAt) phases.push("SPP");
  if (program.sspUnlockedAt) phases.push("SSP");
  return phases;
}

async function programFor(ctx: QueryCtx, user: Doc<"users">) {
  return await ctx.db
    .query("user_programs")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
}

function exerciseIdsInOrder(
  template: Doc<"program_templates">,
  order: number[] | undefined,
): Id<"exercises">[] {
  const source = template.exercises;
  const indexes =
    order && order.length === source.length ? order : source.map((_, index) => index);
  return indexes.map((index) => source[index].exerciseId);
}

async function namesFor(ctx: QueryCtx, ids: Id<"exercises">[]): Promise<string[]> {
  const rows = await Promise.all(ids.map((id) => ctx.db.get(id)));
  return rows.map((row) => row?.name ?? "Unknown exercise");
}

export const listTools = query({
  args: {},
  returns: v.object({
    tools: v.array(v.string()),
    omittedWrites: v.array(v.string()),
  }),
  handler: async () => {
    return {
      tools: [...TOOL_NAMES],
      omittedWrites: [...OMITTED_WRITES],
    };
  },
});

export const readProgram = query({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
      skillLevel: v.union(
        v.literal("Novice"),
        v.literal("Moderate"),
        v.literal("Advanced"),
      ),
      categoryId: v.number(),
      unlockedPhases: v.array(phaseValidator),
    }),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !user.intakeCompletedAt) return null;

    const program = await programFor(ctx, user);
    if (!program) return null;

    return {
      phase: program.currentPhase,
      week: program.currentWeek,
      day: program.currentDay,
      skillLevel: program.skillLevel,
      categoryId: program.gppCategoryId,
      unlockedPhases: unlockedPhases(program),
    };
  },
});

export const readDay = query({
  args: { slot: slotValidator },
  returns: v.object({
    locked: v.boolean(),
    templateId: v.union(v.id("program_templates"), v.null()),
    name: v.union(v.string(), v.null()),
    exerciseIds: v.array(v.id("exercises")),
    exerciseNames: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    const empty = {
      locked: false,
      templateId: null,
      name: null,
      exerciseIds: [] as Id<"exercises">[],
      exerciseNames: [] as string[],
    };
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return empty;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || !user.intakeCompletedAt) return empty;

    const program = await programFor(ctx, user);
    if (!program) return empty;

    if (!unlockedPhases(program).includes(args.slot.phase)) {
      return { ...empty, locked: true };
    }

    const pair = await resolveSlotPair(ctx, program, args.slot, args.slot);
    const template = pair.templateA;
    if (!template) return empty;

    const exerciseIds = exerciseIdsInOrder(template, undefined);
    return {
      locked: false,
      templateId: template._id,
      name: template.name,
      exerciseIds,
      exerciseNames: await namesFor(ctx, exerciseIds),
    };
  },
});

export const sessionOrder = query({
  args: { templateId: v.id("program_templates") },
  returns: v.union(
    v.null(),
    v.object({
      sessionId: v.id("gpp_workout_sessions"),
      version: v.string(),
      exerciseOrder: v.array(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return null;

    const sessions = await ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_template", (q) => q.eq("templateId", args.templateId))
      .order("desc")
      .take(10);

    const session = sessions.find(
      (row) => row.userId === user._id && row.status === "in_progress",
    );
    if (!session) return null;

    const template = await ctx.db.get(session.templateId);
    const length = template?.exercises.length ?? session.exerciseOrder?.length ?? 0;
    const exerciseOrder =
      session.exerciseOrder ?? Array.from({ length }, (_, index) => index);

    return {
      sessionId: session._id,
      version: reorderVersion(session.exerciseOrder, session.startedAt),
      exerciseOrder,
    };
  },
});

const getTodayWorkoutRef = makeFunctionReference<
  "query",
  Record<string, never>,
  {
    _id: Id<"program_templates">;
    name: string;
    exercises: { exerciseId: Id<"exercises">; exercise?: { name: string } | null }[];
  } | null
>("scheduleOverrides:getTodayWorkout");

const sessionOrderRef = makeFunctionReference<
  "query",
  { templateId: Id<"program_templates"> },
  {
    sessionId: Id<"gpp_workout_sessions">;
    version: string;
    exerciseOrder: number[];
  } | null
>("chatHands:sessionOrder");

export const readToday = action({
  args: {},
  returns: v.object({
    templateId: v.union(v.id("program_templates"), v.null()),
    name: v.union(v.string(), v.null()),
    exerciseIds: v.array(v.id("exercises")),
    exerciseNames: v.array(v.string()),
    sessionId: v.union(v.id("gpp_workout_sessions"), v.null()),
    version: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const today = await ctx.runQuery(getTodayWorkoutRef, {});
    if (!today) {
      return {
        templateId: null,
        name: null,
        exerciseIds: [],
        exerciseNames: [],
        sessionId: null,
        version: null,
      };
    }

    const order = await ctx.runQuery(sessionOrderRef, {
      templateId: today._id,
    });
    const indexes = order?.exerciseOrder ?? today.exercises.map((_, index) => index);
    const exerciseIds = indexes.map((index) => today.exercises[index].exerciseId);
    const exerciseNames = indexes.map(
      (index) => today.exercises[index].exercise?.name ?? "Unknown exercise",
    );

    return {
      templateId: today._id,
      name: today.name,
      exerciseIds,
      exerciseNames,
      sessionId: order?.sessionId ?? null,
      version: order?.version ?? null,
    };
  },
});

export const previewReorder = query({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exerciseOrder: v.array(v.number()),
  },
  returns: v.object({
    version: v.union(v.string(), v.null()),
    exerciseIds: v.array(v.id("exercises")),
    valid: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const empty = { version: null, exerciseIds: [] as Id<"exercises">[], valid: false };
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return empty;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user) return empty;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id || session.status !== "in_progress") {
      return empty;
    }

    const template = await ctx.db.get(session.templateId);
    if (!template) return empty;

    const valid = isPermutation(args.exerciseOrder, template.exercises.length);
    return {
      version: reorderVersion(session.exerciseOrder, session.startedAt),
      exerciseIds: valid ? exerciseIdsInOrder(template, args.exerciseOrder) : [],
      valid,
    };
  },
});

export const commitReorder = mutation({
  args: {
    sessionId: v.id("gpp_workout_sessions"),
    exerciseOrder: v.array(v.number()),
    version: v.string(),
    accepted: v.boolean(),
  },
  returns: writeResult,
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id || session.status !== "in_progress") {
      return { written: false, reason: "no_session" as const };
    }

    const template = await ctx.db.get(session.templateId);
    if (!template || !isPermutation(args.exerciseOrder, template.exercises.length)) {
      return { written: false, reason: "bad_order" as const };
    }

    if (!args.accepted) {
      return { written: false, reason: "not_accepted" as const };
    }

    const current = reorderVersion(session.exerciseOrder, session.startedAt);
    if (current !== args.version) {
      return { written: false, reason: "stale" as const };
    }

    await writeExerciseOrder(ctx, session, args.exerciseOrder);
    return { written: true, reason: "ok" as const };
  },
});

export const previewSwap = query({
  args: { slotA: slotValidator, slotB: slotValidator },
  returns: v.object({
    version: v.union(v.string(), v.null()),
    dayA: v.union(v.string(), v.null()),
    dayB: v.union(v.string(), v.null()),
    locked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const empty = { version: null, dayA: null, dayB: null, locked: false };
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return empty;

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .first();
    if (!user || !user.intakeCompletedAt) return empty;

    const program = await programFor(ctx, user);
    if (!program) return empty;

    const open = unlockedPhases(program);
    if (!open.includes(args.slotA.phase) || !open.includes(args.slotB.phase)) {
      return { ...empty, locked: true };
    }

    const { existingOverride, templateA, templateB } = await resolveSlotPair(
      ctx,
      program,
      args.slotA,
      args.slotB,
    );
    if (!templateA || !templateB) return empty;

    return {
      version: swapVersion(
        existingOverride?.updatedAt ?? null,
        templateA._id,
        templateB._id,
      ),
      dayA: templateB.name,
      dayB: templateA.name,
      locked: false,
    };
  },
});

export const commitSwap = mutation({
  args: {
    slotA: slotValidator,
    slotB: slotValidator,
    version: v.string(),
    accepted: v.boolean(),
  },
  returns: writeResult,
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    if (!user.intakeCompletedAt) {
      return { written: false, reason: "no_session" as const };
    }

    const program = await programFor(ctx, user);
    if (!program) {
      return { written: false, reason: "no_session" as const };
    }

    const open = unlockedPhases(program);
    if (!open.includes(args.slotA.phase) || !open.includes(args.slotB.phase)) {
      return { written: false, reason: "locked" as const };
    }

    if (!args.accepted) {
      return { written: false, reason: "not_accepted" as const };
    }

    const { existingOverride, templateA, templateB } = await resolveSlotPair(
      ctx,
      program,
      args.slotA as WorkoutSlotRef,
      args.slotB as WorkoutSlotRef,
    );
    if (!templateA || !templateB) {
      return { written: false, reason: "no_session" as const };
    }

    const current = swapVersion(
      existingOverride?.updatedAt ?? null,
      templateA._id,
      templateB._id,
    );
    if (current !== args.version) {
      return { written: false, reason: "stale" as const };
    }

    await applyWorkoutSwap(
      ctx,
      user,
      program,
      args.slotA as WorkoutSlotRef,
      args.slotB as WorkoutSlotRef,
    );
    return { written: true, reason: "ok" as const };
  },
});
