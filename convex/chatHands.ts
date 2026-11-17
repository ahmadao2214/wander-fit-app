/**
 * The chat hands: what a chat connector may read and change on the athlete's
 * own program (docs/adr/0001-chat-hands-stay-inside-the-program.md).
 *
 * Every function here is internal and takes the Clerk user id that
 * convex/http.ts verified from a Clerk OAuth access token. Nothing here is
 * callable from a client, so the app's own session token cannot reach it.
 */
import { internalMutation, internalQuery } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { writeExerciseOrder } from "./gppWorkoutSessions";
import { applyWorkoutSwap, resolveSlotPair, todayWorkoutFor } from "./scheduleOverrides";
import type { WorkoutSlotRef } from "./scheduleOverrides";
import {
  OMITTED_WRITES,
  TOOL_NAMES,
  isPermutation,
  reorderVersion,
  swapVersion,
} from "./chatHandsVersion";

const phaseValidator = v.union(v.literal("GPP"), v.literal("SPP"), v.literal("SSP"));

const slotValidator = v.object({
  phase: phaseValidator,
  week: v.number(),
  day: v.number(),
});

const athlete = { clerkId: v.string() };

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

async function userFor(ctx: QueryCtx, clerkId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
    .first();
}

async function programFor(ctx: QueryCtx, user: Doc<"users">) {
  return await ctx.db
    .query("user_programs")
    .withIndex("by_user", (q) => q.eq("userId", user._id))
    .first();
}

/** The athlete past intake and their program, or null. */
async function athleteProgram(ctx: QueryCtx, clerkId: string) {
  const user = await userFor(ctx, clerkId);
  if (!user || !user.intakeCompletedAt) return null;
  const program = await programFor(ctx, user);
  return program ? { user, program } : null;
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

async function inProgressSession(
  ctx: QueryCtx,
  user: Doc<"users">,
  templateId: Id<"program_templates">,
) {
  const sessions = await ctx.db
    .query("gpp_workout_sessions")
    .withIndex("by_template", (q) => q.eq("templateId", templateId))
    .order("desc")
    .take(10);
  return sessions.find((row) => row.userId === user._id && row.status === "in_progress") ?? null;
}

export const listTools = internalQuery({
  args: {},
  returns: v.object({
    tools: v.array(v.string()),
    omittedWrites: v.array(v.string()),
  }),
  handler: async () => ({
    tools: [...TOOL_NAMES],
    omittedWrites: [...OMITTED_WRITES],
  }),
});

export const readProgram = internalQuery({
  args: athlete,
  returns: v.union(
    v.null(),
    v.object({
      phase: phaseValidator,
      week: v.number(),
      day: v.number(),
      skillLevel: v.union(v.literal("Novice"), v.literal("Moderate"), v.literal("Advanced")),
      categoryId: v.number(),
      unlockedPhases: v.array(phaseValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const found = await athleteProgram(ctx, args.clerkId);
    if (!found) return null;
    const { program } = found;
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

export const readDay = internalQuery({
  args: { ...athlete, slot: slotValidator },
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
    const found = await athleteProgram(ctx, args.clerkId);
    if (!found) return empty;
    const { program } = found;

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

/** Today's workout through the app's own Today logic, in the athlete's saved order. */
export const readToday = internalQuery({
  args: athlete,
  returns: v.object({
    templateId: v.union(v.id("program_templates"), v.null()),
    name: v.union(v.string(), v.null()),
    exerciseIds: v.array(v.id("exercises")),
    exerciseNames: v.array(v.string()),
    sessionId: v.union(v.id("gpp_workout_sessions"), v.null()),
    version: v.union(v.string(), v.null()),
  }),
  handler: async (ctx, args) => {
    const none = {
      templateId: null,
      name: null,
      exerciseIds: [] as Id<"exercises">[],
      exerciseNames: [] as string[],
      sessionId: null,
      version: null,
    };
    const today = (await todayWorkoutFor(ctx, args.clerkId)) as
      | (Doc<"program_templates"> & {
          exercises: Array<{ exerciseId: Id<"exercises">; exercise?: { name: string } | null }>;
        })
      | null;
    const user = await userFor(ctx, args.clerkId);
    if (!today || !user) return none;

    const session = await inProgressSession(ctx, user, today._id);
    const indexes =
      session?.exerciseOrder && session.exerciseOrder.length === today.exercises.length
        ? session.exerciseOrder
        : today.exercises.map((_, index) => index);

    return {
      templateId: today._id,
      name: today.name,
      exerciseIds: indexes.map((index) => today.exercises[index].exerciseId),
      exerciseNames: indexes.map(
        (index) => today.exercises[index].exercise?.name ?? "Unknown exercise",
      ),
      sessionId: session?._id ?? null,
      version: session ? reorderVersion(session.exerciseOrder, session.startedAt) : null,
    };
  },
});

export const previewReorder = internalQuery({
  args: {
    ...athlete,
    sessionId: v.id("gpp_workout_sessions"),
    exerciseOrder: v.array(v.number()),
  },
  returns: v.object({
    version: v.union(v.string(), v.null()),
    exerciseIds: v.array(v.id("exercises")),
    exerciseNames: v.array(v.string()),
    valid: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const empty = {
      version: null,
      exerciseIds: [] as Id<"exercises">[],
      exerciseNames: [] as string[],
      valid: false,
    };
    const user = await userFor(ctx, args.clerkId);
    if (!user) return empty;

    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== user._id || session.status !== "in_progress") {
      return empty;
    }

    const template = await ctx.db.get(session.templateId);
    if (!template) return empty;

    const valid = isPermutation(args.exerciseOrder, template.exercises.length);
    const exerciseIds = valid ? exerciseIdsInOrder(template, args.exerciseOrder) : [];
    return {
      version: reorderVersion(session.exerciseOrder, session.startedAt),
      exerciseIds,
      exerciseNames: await namesFor(ctx, exerciseIds),
      valid,
    };
  },
});

export const commitReorder = internalMutation({
  args: {
    ...athlete,
    sessionId: v.id("gpp_workout_sessions"),
    exerciseOrder: v.array(v.number()),
    version: v.string(),
    accepted: v.boolean(),
  },
  returns: writeResult,
  handler: async (ctx, args) => {
    const user = await userFor(ctx, args.clerkId);
    const session = await ctx.db.get(args.sessionId);
    if (!user || !session || session.userId !== user._id || session.status !== "in_progress") {
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

export const previewSwap = internalQuery({
  args: { ...athlete, slotA: slotValidator, slotB: slotValidator },
  returns: v.object({
    version: v.union(v.string(), v.null()),
    dayA: v.union(v.string(), v.null()),
    dayB: v.union(v.string(), v.null()),
    locked: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const empty = { version: null, dayA: null, dayB: null, locked: false };
    const found = await athleteProgram(ctx, args.clerkId);
    if (!found) return empty;
    const { program } = found;

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
      version: swapVersion(existingOverride?.updatedAt ?? null, templateA._id, templateB._id),
      dayA: templateB.name,
      dayB: templateA.name,
      locked: false,
    };
  },
});

export const commitSwap = internalMutation({
  args: {
    ...athlete,
    slotA: slotValidator,
    slotB: slotValidator,
    version: v.string(),
    accepted: v.boolean(),
  },
  returns: writeResult,
  handler: async (ctx, args) => {
    const found = await athleteProgram(ctx, args.clerkId);
    if (!found) {
      return { written: false, reason: "no_session" as const };
    }
    const { user, program } = found;

    const open = unlockedPhases(program);
    if (!open.includes(args.slotA.phase) || !open.includes(args.slotB.phase)) {
      return { written: false, reason: "locked" as const };
    }

    if (!args.accepted) {
      return { written: false, reason: "not_accepted" as const };
    }

    const slotA = args.slotA as WorkoutSlotRef;
    const slotB = args.slotB as WorkoutSlotRef;
    const { existingOverride, templateA, templateB } = await resolveSlotPair(
      ctx,
      program,
      slotA,
      slotB,
    );
    if (!templateA || !templateB) {
      return { written: false, reason: "no_session" as const };
    }

    const current = swapVersion(existingOverride?.updatedAt ?? null, templateA._id, templateB._id);
    if (current !== args.version) {
      return { written: false, reason: "stale" as const };
    }

    await applyWorkoutSwap(ctx, user, program, slotA, slotB);
    return { written: true, reason: "ok" as const };
  },
});
