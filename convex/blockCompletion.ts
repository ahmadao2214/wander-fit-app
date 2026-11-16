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
 * Where the program calendar starts counting slots from.
 *
 * The calendar lays the three phases end to end, weeksPerPhase weeks each.
 * Counting from program.createdAt only matches while every block starts on
 * time. A repeated block, a late check-in or a new cycle after SSP starts the
 * current phase later, so the anchor is moved back from phaseStartDate by
 * the phases before it: week 1 day 1 of the current phase then lands on the
 * first training day on or after phaseStartDate. For a program that has run
 * on time, this is createdAt.
 */
export function scheduleStart(program: BlockProgram & { weeksPerPhase?: number }): Date {
  const phaseIndex = Math.max(0, PHASES.indexOf(program.currentPhase));
  const weeks = program.weeksPerPhase ?? 4;
  return new Date(program.phaseStartDate - phaseIndex * weeks * 7 * DAY_MS);
}
