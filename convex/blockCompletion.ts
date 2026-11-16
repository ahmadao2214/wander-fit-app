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
