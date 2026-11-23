import { mapUserWeekToTemplateWeek } from './weekMapping'

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
  status: string
  startedAt: number
  completedAt?: number
  templateSnapshot?: { phase?: string }
  redo?: boolean
}

export type BlockProgram = {
  currentPhase: string
  phaseStartDate: number
}

export function countsAsDone(session: BlockSession, program: BlockProgram): boolean {
  if (session.status !== 'completed') return false
  // Doing a finished workout again is extra work, not progress
  if (session.redo) return false
  if (session.templateSnapshot?.phase !== program.currentPhase) return true
  return (session.completedAt ?? session.startedAt) >= program.phaseStartDate
}

const PHASES = ['GPP', 'SPP', 'SSP']
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Where the program calendar counts each phase's slots from.
 *
 * The calendar lays the three phases end to end, weeksPerPhase weeks each,
 * from an anchor date. Counting every phase from program.createdAt only
 * matches while every block starts on time. A repeated block, a late
 * check-in or a new cycle after SSP starts a phase later, so each check-in
 * stores an anchor for the phase it starts and the phases after it
 * (program.calendarAnchors), and keeps the anchors of the phases before it.
 * A phase's dates never move once it is past. Programs that have not had a
 * check-in since then count every phase from createdAt, as before.
 */
export type CalendarAnchors = { GPP?: number; SPP?: number; SSP?: number }

export type ScheduleProgram = {
  currentPhase: string
  createdAt: number
  calendarAnchors?: CalendarAnchors
}

/** The anchor for one phase's slots. */
export function phaseAnchor(program: ScheduleProgram, phase: string): Date {
  return new Date(program.calendarAnchors?.[phase as keyof CalendarAnchors] ?? program.createdAt)
}

/** The earliest anchor: where the calendar begins. */
export function calendarStart(program: ScheduleProgram): Date {
  return new Date(Math.min(...PHASES.map((phase) => phaseAnchor(program, phase).getTime())))
}

/**
 * The anchors after a check-in that starts `nextPhase` at `startedAt`: week
 * 1 day 1 of that phase lands on the first training day on or after
 * startedAt, the phases after it follow on, and earlier phases keep theirs.
 * A phase that starts early is placed right after the phase before it
 * instead, so phases never share dates (Today still offers it right away).
 */
export function anchorsAfterCheckIn(
  program: ScheduleProgram,
  nextPhase: string,
  startedAt: number,
  weeksPerPhase: number
): CalendarAnchors {
  const from = PHASES.indexOf(nextPhase)
  const previous = from > 0 ? phaseAnchor(program, PHASES[from - 1]).getTime() : -Infinity
  const anchor = Math.max(startedAt - from * weeksPerPhase * 7 * DAY_MS, previous)
  const anchors: CalendarAnchors = {}
  PHASES.forEach((phase, index) => {
    anchors[phase as keyof CalendarAnchors] =
      index < from ? phaseAnchor(program, phase).getTime() : anchor
  })
  return anchors
}

/**
 * The slot on a date, given a lookup from one anchor. Each anchor only owns
 * its own phases, so a date in a past phase isn't read as a current one.
 * Where two phases share a date, the current phase and later ones win, then
 * the most recent past phase.
 */
export function slotOnDate<S extends { phase: string }>(
  program: ScheduleProgram,
  find: (anchor: Date) => S | null
): S | null {
  const current = Math.max(0, PHASES.indexOf(program.currentPhase))
  const order = [...PHASES.slice(current), ...PHASES.slice(0, current).reverse()]
  const tried = new Set<number>()
  for (const phase of order) {
    const anchor = phaseAnchor(program, phase)
    if (tried.has(anchor.getTime())) continue
    tried.add(anchor.getTime())
    const slot = find(anchor)
    if (slot && phaseAnchor(program, slot.phase).getTime() === anchor.getTime()) return slot
  }
  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// WHICH SLOTS ARE DONE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Templates exist for weeks 1-4 only, so a phase longer than four weeks
 * repeats some of them: in a 5-week phase, user weeks 2 and 3 both use the
 * week-2 workouts. A workout done once is then done in its first slot, not in
 * every slot that repeats it. Each completed session fills the next slot that
 * holds its workout, in program order.
 */
export type SlotRef = { phase: string; week: number; day: number }
export type LayoutSlot = SlotRef & { templateId: string }

export const slotKey = (slot: SlotRef) => `${slot.phase}-${slot.week}-${slot.day}`

export type LayoutTemplate = { _id: string; phase: string; week: number; day: number }
export type LayoutOverride = { phase: string; week: number; day: number; templateId: string }

/**
 * Every slot of the program in order (phase, user week, day), with the
 * workout it holds after slot overrides. Days are the template days of the
 * week, the same list Today walks.
 */
export function programLayout(
  templates: readonly LayoutTemplate[],
  slotOverrides: readonly LayoutOverride[],
  weeksPerPhase: number
): LayoutSlot[] {
  const overrides = new Map(slotOverrides.map((o) => [slotKey(o), String(o.templateId)]))
  const layout: LayoutSlot[] = []
  for (const phase of PHASES) {
    for (let week = 1; week <= weeksPerPhase; week++) {
      const templateWeek = mapUserWeekToTemplateWeek(week, weeksPerPhase)
      const days = templates
        .filter((t) => t.phase === phase && t.week === templateWeek)
        .sort((a, b) => a.day - b.day)
      for (const t of days) {
        const slot = { phase, week, day: t.day }
        layout.push({ ...slot, templateId: overrides.get(slotKey(slot)) ?? String(t._id) })
      }
    }
  }
  return layout
}

/**
 * The done slots, each with the session that did it. `sessions` are the ones
 * that count (see countsAsDone); the earliest fills the first slot.
 */
export function doneSlots<
  S extends { templateId: string; completedAt?: number; startedAt: number },
>(layout: readonly LayoutSlot[], sessions: readonly S[]): Map<string, S> {
  const byTemplate = new Map<string, S[]>()
  const when = (s: S) => s.completedAt ?? s.startedAt
  for (const session of [...sessions].sort((a, b) => when(a) - when(b))) {
    const id = String(session.templateId)
    byTemplate.set(id, [...(byTemplate.get(id) ?? []), session])
  }
  const done = new Map<string, S>()
  const used = new Map<string, number>()
  for (const slot of layout) {
    const n = used.get(slot.templateId) ?? 0
    const session = byTemplate.get(slot.templateId)?.[n]
    if (!session) continue
    used.set(slot.templateId, n + 1)
    done.set(slotKey(slot), session)
  }
  return done
}

/**
 * Whether a workout is done for where the athlete is now: every slot that
 * holds it, in the current phase, up to the current week. A workout from a
 * later week (done early) or another phase is done once its first slot is.
 */
export function isWorkoutDone(
  layout: readonly LayoutSlot[],
  done: ReadonlyMap<string, unknown>,
  templateId: string,
  position: { currentPhase: string; currentWeek: number }
): boolean {
  const slots = layout.filter((slot) => slot.templateId === String(templateId))
  if (slots.length === 0) return false
  const due = slots.filter(
    (slot) => slot.phase === position.currentPhase && slot.week <= position.currentWeek
  )
  return (due.length > 0 ? due : [slots[0]]).every((slot) => done.has(slotKey(slot)))
}
