/**
 * Which completed sessions still mark a workout as done.
 *
 * A phase can run more than once: the athlete can repeat a block after the
 * check-in, and SSP wraps back to GPP. A session from an earlier run of the
 * phase the athlete is in now (before program.phaseStartDate) is history,
 * not progress in this block, so it doesn't mark the workout done. Sessions
 * from other phases still do, so past phases stay done on the calendar.
 * Past performance ("last time you did this") reads sessions directly and is
 * not affected.
 */
export type BlockSession = {
  status: string;
  startedAt: number;
  completedAt?: number;
  templateSnapshot?: { phase?: string };
};

export type BlockProgram = {
  currentPhase: string;
  phaseStartDate: number;
};

export function countsAsDone(session: BlockSession, program: BlockProgram): boolean {
  if (session.status !== "completed") return false;
  if (session.templateSnapshot?.phase !== program.currentPhase) return true;
  return (session.completedAt ?? session.startedAt) >= program.phaseStartDate;
}

const PHASES = ["GPP", "SPP", "SSP"];
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Where the program calendar counts each phase's slots from.
 *
 * The calendar lays the three phases end to end, weeksPerPhase weeks each,
 * from one anchor date. Counting from program.createdAt only matches while
 * every block starts on time. A repeated block, a late check-in or a new
 * cycle after SSP starts the current phase later, so the current phase and
 * the ones after it count from scheduleStart: phaseStartDate moved back by
 * the phases before it, which puts week 1 day 1 on the first training day on
 * or after phaseStartDate. Past phases keep the dates they had (createdAt),
 * unless the current phase started early, so they never overlap it. For a
 * program that has run on time, every anchor is createdAt.
 */
export type ScheduleProgram = BlockProgram & { createdAt: number; weeksPerPhase?: number };

export function scheduleStart(program: ScheduleProgram): Date {
  const phaseIndex = Math.max(0, PHASES.indexOf(program.currentPhase));
  const weeks = program.weeksPerPhase ?? 4;
  return new Date(program.phaseStartDate - phaseIndex * weeks * 7 * DAY_MS);
}

/** The earliest anchor: where the calendar begins. */
export function calendarStart(program: ScheduleProgram): Date {
  return new Date(Math.min(program.createdAt, scheduleStart(program).getTime()));
}

/** The anchor for one phase's slots. */
export function phaseAnchor(program: ScheduleProgram, phase: string): Date {
  const isPast = PHASES.indexOf(phase) < PHASES.indexOf(program.currentPhase);
  return isPast ? calendarStart(program) : scheduleStart(program);
}

/**
 * The slot on a date, given a lookup from one anchor. Each anchor only owns
 * its own phases, so a date in a past phase isn't read as a current one.
 */
export function slotOnDate<S extends { phase: string }>(
  program: ScheduleProgram,
  find: (anchor: Date) => S | null,
): S | null {
  for (const anchor of [scheduleStart(program), calendarStart(program)]) {
    const slot = find(anchor);
    if (slot && phaseAnchor(program, slot.phase).getTime() === anchor.getTime()) return slot;
  }
  return null;
}
