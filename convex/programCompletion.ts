import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import {
  countsAsDone,
  doneSlots,
  isWorkoutDone,
  programLayout,
  slotKey,
  type LayoutOverride,
  type SlotRef,
} from "./blockCompletion";
import { DEFAULT_WEEKS_PER_PHASE } from "./weekMapping";

/**
 * What the athlete has done in their program, slot by slot. Today, the
 * calendar, the detail screen, swaps, moves and the chat connector all read
 * completion through this, so they agree on which workouts are done.
 */
export async function loadProgramCompletion(ctx: QueryCtx, program: Doc<"user_programs">) {
  const [templates, override, sessions] = await Promise.all([
    ctx.db
      .query("program_templates")
      .withIndex("by_category_skill", (q) =>
        q.eq("gppCategoryId", program.gppCategoryId).eq("skillLevel", program.skillLevel)
      )
      .collect(),
    ctx.db
      .query("user_schedule_overrides")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .first(),
    ctx.db
      .query("gpp_workout_sessions")
      .withIndex("by_user_program", (q) => q.eq("userProgramId", program._id))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect(),
  ]);

  // An override whose workout was deleted falls back to the slot's default
  // workout, as Today does, so it must not hold the deleted one here either
  const known = new Set(templates.map((t) => String(t._id)));
  const unknownIds = [...new Set((override?.slotOverrides ?? []).map((o) => String(o.templateId)))].filter(
    (id) => !known.has(id),
  );
  const missing = new Set<string>();
  await Promise.all(
    unknownIds.map(async (id) => {
      const doc = await ctx.db.get(id as Doc<"program_templates">["_id"]);
      if (!doc) missing.add(id);
    }),
  );
  const weeksPerPhase = program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE;
  const layoutTemplates = templates.map((t) => ({ _id: t._id, phase: t.phase, week: t.week, day: t.day }));
  const layoutWith = (overrides: readonly LayoutOverride[]) =>
    programLayout(
      layoutTemplates,
      overrides.filter((o) => !missing.has(String(o.templateId))),
      weeksPerPhase,
    );

  const layout = layoutWith(override?.slotOverrides ?? []);
  const counted = sessions.filter((s) => countsAsDone(s, program));
  const done = doneSlots(layout, counted);

  return {
    /** Completed sessions that count as progress (no Redos, this block only). */
    sessions: counted,
    /** Every workout logged in this block, Redos included (for history). */
    logged: sessions.filter((s) => countsAsDone({ ...s, redo: undefined }, program)),
    /** The session that did this slot, if it is done. */
    sessionFor: (slot: SlotRef) => done.get(slotKey(slot)),
    isSlotDone: (slot: SlotRef) => done.has(slotKey(slot)),
    /** Done for where the athlete is now (see isWorkoutDone). */
    isWorkoutDone: (templateId: string) => isWorkoutDone(layout, done, templateId, program),
    /**
     * Whether saving these slot overrides leaves every done slot done by the
     * same session. Completion follows the order of the program, so moving a
     * repeated workout earlier could otherwise hand a finished session to a
     * different slot and reopen the one it did.
     */
    keepsDone: (overrides: readonly LayoutOverride[]) => {
      const after = doneSlots(layoutWith(overrides), counted);
      if (after.size !== done.size) return false;
      for (const [key, session] of done) {
        if (after.get(key) !== session) return false;
      }
      return true;
    },
  };
}

export type ProgramCompletion = Awaited<ReturnType<typeof loadProgramCompletion>>;
