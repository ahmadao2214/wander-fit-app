/**
 * Workout session clock. Exit pauses a session; the time it sits paused
 * isn't workout time, so it's kept out of the timer and the duration.
 */
import { todayHeading } from './today'

/** Why a workout won't start while another is paused. Shared by the server and the detail screen. */
export const PAUSED_SESSION_MESSAGE =
  'You have a paused workout. Resume it or discard it from Today before starting another.'

export type SessionClock = {
  startedAt: number
  /** Set while the session is paused */
  pausedAt?: number
  /** Seconds spent paused in earlier pauses */
  pausedSeconds?: number
}

/** Seconds of workout time: from the start, minus pauses, stopped at a current pause. */
export function activeSeconds(clock: SessionClock, now: number): number {
  const end = clock.pausedAt ?? now
  return Math.max(0, Math.round((end - clock.startedAt) / 1000) - (clock.pausedSeconds ?? 0))
}

/** The paused total once the current pause ends at `now`. */
export function pausedSecondsAfterResume(clock: SessionClock, now: number): number {
  const total = clock.pausedSeconds ?? 0
  if (clock.pausedAt === undefined) return total
  return total + Math.max(0, Math.round((now - clock.pausedAt) / 1000))
}

/** "Paused yesterday": when a paused workout was left, for the Today card. */
export function pausedLabel(pausedAt: number, now: Date): string {
  const paused = new Date(pausedAt)
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOfDay(now) - startOfDay(paused)) / 86_400_000)
  if (days <= 0) return 'Paused earlier today'
  if (days === 1) return 'Paused yesterday'
  return `Paused ${todayHeading(paused)}`
}
