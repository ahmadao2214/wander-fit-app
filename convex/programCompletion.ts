import type { Doc } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { countsAsDone, doneSlots, isWorkoutDone, programLayout, slotKey, type SlotRef } from "./blockCompletion";
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

  const layout = programLayout(
    templates.map((t) => ({ _id: t._id, phase: t.phase, week: t.week, day: t.day })),
    (override?.slotOverrides ?? []).map((o) => ({ ...o, templateId: o.templateId })),
    program.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE,
  );
  const counted = sessions.filter((s) => countsAsDone(s, program));
  const done = doneSlots(layout, counted);

  return {
    /** Completed sessions that count as progress (no Redos, this block only). */
    sessions: counted,
    /** The session that did this slot, if it is done. */
    sessionFor: (slot: SlotRef) => done.get(slotKey(slot)),
    isSlotDone: (slot: SlotRef) => done.has(slotKey(slot)),
    /** Done for where the athlete is now (see isWorkoutDone). */
    isWorkoutDone: (templateId: string) => isWorkoutDone(layout, done, templateId, program),
  };
}

export type ProgramCompletion = Awaited<ReturnType<typeof loadProgramCompletion>>;
