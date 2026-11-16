/**
 * First Run v2 copy and story rules (docs/first-run-v2/STORYBOARD.md): the four
 * categories as athletes see them, the Popular sports, each sport's movement
 * family for the Days screen, the plain-English phases, and the reveal's
 * "Your week" strip. Pure functions only, so the screens stay thin.
 */
import type { Phase } from '../types'
import { dayLabel, firstTrainingDate, formatSeasonDate, normalizeTrainingDays } from './firstRun'

// ─── Game night ─────────────────────────────────────────────────────────────

/** The intake is always dark, whatever the phone's theme. */
export const NIGHT = {
  ink: '#0B1220', // page ground: deep navy
  ink2: '#131C2E', // raised surface
  line: '#24314A', // hairlines, empty tiles
  fg: '#F4F6FB',
  fg2: '#9AA6BD',
  action: '#2563EB',
  actionPress: '#1E40AF',
  link: '#60A5FA',
} as const

/** Mixes `color` over `base`: `amount` 0 is `base`, 1 is `color`. Hex in, hex out. */
export function mixHex(color: string, base: string, amount: number): string {
  const parse = (hex: string) => {
    const h = hex.replace('#', '')
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16))
  }
  const a = parse(color)
  const b = parse(base)
  const k = Math.min(1, Math.max(0, amount))
  return (
    '#' +
    a
      .map((v, i) => Math.round(b[i] + (v - b[i]) * k))
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  )
}

// ─── Categories ─────────────────────────────────────────────────────────────

export type CategoryId = 1 | 2 | 3 | 4

export interface StoryCategory {
  id: CategoryId
  /** What athletes see: Endurance, Power, Rotation, Strength. */
  name: string
  color: string
  line: string
  /** Finishes "Training shifts to … for basketball." */
  focus: string
}

export const STORY_CATEGORIES: Record<CategoryId, StoryCategory> = {
  1: {
    id: 1,
    name: 'Endurance',
    color: '#14B8A6',
    line: 'Long runs with changes of direction. Built on endurance and single-leg stability.',
    focus: 'repeat sprints and quick changes of direction',
  },
  2: {
    id: 2,
    name: 'Power',
    color: '#A855F7',
    line: 'Jumping, landing and stopping fast. Built on vertical power and safe landings.',
    focus: 'jumping, landing and stopping fast',
  },
  3: {
    id: 3,
    name: 'Rotation',
    color: '#F97316',
    line: 'Swinging, throwing and twisting with force. Built on hip power and core control.',
    focus: 'hip power and rotation',
  },
  4: {
    id: 4,
    name: 'Strength',
    color: '#3B82F6',
    line: 'Contact, grappling and moving heavy things. Built on total-body strength and grip.',
    focus: 'heavier strength and grip',
  },
}

export const CATEGORY_IDS: readonly CategoryId[] = [1, 2, 3, 4]

/** Unknown ids fall back to Strength, which General Fitness uses. */
export function storyCategory(id: number | undefined | null): StoryCategory {
  return STORY_CATEGORIES[(id as CategoryId) in STORY_CATEGORIES ? (id as CategoryId) : 4]
}

/** The world takes this faint wash of the category color once a sport is picked. */
export function tintedGround(categoryColor: string | null | undefined): string {
  return categoryColor ? mixHex(categoryColor, NIGHT.ink, 0.16) : NIGHT.ink
}

// ─── Sport ──────────────────────────────────────────────────────────────────

export const POPULAR_SPORTS: readonly string[] = [
  'Basketball',
  'Soccer',
  'Football',
  'Baseball',
  'Volleyball',
  'Track (Sprints/Jumps)',
]

/** Popular in its fixed order, then everything else alphabetically. */
export function splitSports<T extends { name: string }>(sports: readonly T[]): { popular: T[]; rest: T[] } {
  const popular = POPULAR_SPORTS.map((n) => sports.find((s) => s.name === n)).filter((s): s is T => !!s)
  const rest = sports
    .filter((s) => !POPULAR_SPORTS.includes(s.name))
    .sort((a, b) => a.name.localeCompare(b.name))
  return { popular, rest }
}

/** Sport icons that drift behind the promise: one per category plus General Fitness. */
export const DRIFT_SPORTS: readonly { name: string; top: number; delay: number; seconds: number }[] = [
  { name: 'Basketball', top: 120, delay: 0, seconds: 25 },
  { name: 'Soccer', top: 330, delay: 9, seconds: 27 },
  { name: 'Golf', top: 520, delay: 17, seconds: 24 },
  { name: 'Wrestling', top: 230, delay: 5, seconds: 28 },
  { name: 'General Fitness', top: 620, delay: 23, seconds: 22 },
]

// ─── Days ───────────────────────────────────────────────────────────────────

export type MovementFamily = 'roll' | 'bounce' | 'water'

const FAMILIES: Record<string, MovementFamily> = {
  Soccer: 'roll',
  'Field Hockey': 'roll',
  Lacrosse: 'roll',
  Rugby: 'roll',
  Basketball: 'bounce',
  Volleyball: 'bounce',
  Swimming: 'water',
  Diving: 'water',
}

/** The day-tile choreography for a sport, or null for the plain gauge fill. */
export function movementFamily(sportName: string | undefined): MovementFamily | null {
  return (sportName && FAMILIES[sportName]) || null
}

/** Monday first, as athletes plan their week. Index 0 = Sunday. */
export const WEEK_ORDER: readonly number[] = [1, 2, 3, 4, 5, 6, 0]
export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
export const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

/** "3 sessions a week" and "Mon / Wed / Fri". */
export function daysSummary(days: readonly number[]): { count: string; list: string } {
  const on = WEEK_ORDER.filter((d) => days.includes(d))
  return {
    count: `${on.length} ${on.length === 1 ? 'session' : 'sessions'} a week`,
    list: on.length ? on.map((d) => DAY_SHORT[d]).join(' / ') : 'Pick at least one day',
  }
}

// ─── Season ─────────────────────────────────────────────────────────────────

export interface CalendarCell {
  day: number
  iso: string
  /** Today or earlier: not a first game. */
  disabled: boolean
}

/** A month as rows of seven, Sunday first, with null padding. */
export function monthGrid(year: number, month: number, now: Date): (CalendarCell | null)[] {
  const first = new Date(year, month, 1).getDay()
  const count = new Date(year, month + 1, 0).getDate()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const cells: (CalendarCell | null)[] = Array.from({ length: first }, () => null)
  for (let d = 1; d <= count; d++) {
    const date = new Date(year, month, d)
    const mm = String(month + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    cells.push({ day: d, iso: `${year}-${mm}-${dd}`, disabled: date.getTime() <= today })
  }
  while (cells.length % 7) cells.push(null)
  return cells
}

// ─── Plan ───────────────────────────────────────────────────────────────────

export interface StoryPhase {
  phase: Phase
  label: string
}

export const STORY_PHASES: readonly StoryPhase[] = [
  { phase: 'GPP', label: 'Build the base' },
  { phase: 'SPP', label: 'Train for your sport' },
  { phase: 'SSP', label: 'Sharpen for the season' },
]

/** The colors the phase bar uses on game night: one hue deepening GPP → SSP. */
export const NIGHT_PHASE_FILL: Record<Phase, string> = { GPP: '#3B82F6', SPP: '#1D4ED8', SSP: '#1E3A8A' }

/** The caption under the phase bar. One holds while the bar draws; taps change it. */
export function phaseCaption(phase: Phase, sportName: string, category: StoryCategory, noSeason: boolean): string {
  if (phase === 'GPP') return 'General fitness and how you move: strength, mobility and conditioning.'
  if (phase === 'SPP') return `Training shifts to ${category.focus} for ${sportName.toLowerCase()}.`
  return `Less volume, the same speed and power, and recovery timed so you're fresh for ${
    noSeason ? 'the season' : 'your first game'
  }.`
}

/** "First game Sun, Feb 7 · 12 weeks", or the no-season plan. */
export function countdownLine(seasonStart: string | null, weeks: number, programWeeks: number): string {
  if (seasonStart === null) return `No set season · ${programWeeks}-week plan`
  return `First game ${formatSeasonDate(seasonStart)} · ${weeks} ${weeks === 1 ? 'week' : 'weeks'}`
}

/** "Lower Body A - Foundation" → "Lower Body A". */
export function workoutShortName(name: string): string {
  return name.split(' - ')[0].trim()
}

/** The strip's one-word label: LOWER, UPPER, POWER, FULL, RECOVER. */
export function workoutTag(name: string): string {
  const n = workoutShortName(name).toLowerCase()
  if (n.includes('recover')) return 'RECOVER'
  if (n.startsWith('full')) return 'FULL'
  return (n.split(/[\s&/]+/)[0] || '').toUpperCase()
}

export interface WeekTemplate {
  day: number
  name: string
  estimatedDurationMinutes: number
}

export interface WeekStripDay {
  /** 0 = Sunday. */
  dow: number
  short: string
  /** 1-based program day, or null on a rest day. */
  programDay: number | null
  tag: string | null
  template: WeekTemplate | null
}

/**
 * The seven days, Monday first. Training days take the program's days in
 * order, starting from the first one on or after today, so Day 1 is the
 * next session the athlete will do.
 */
export function weekStrip(
  trainingDays: readonly number[],
  templates: readonly WeekTemplate[],
  now: Date
): WeekStripDay[] {
  const days = normalizeTrainingDays(trainingDays)
  const order = WEEK_ORDER.filter((d) => days.includes(d))
  const firstDow = firstTrainingDate(days, now).getDay()
  const start = Math.max(0, order.indexOf(firstDow))
  const byDay = [...templates].sort((a, b) => a.day - b.day)
  return WEEK_ORDER.map((dow) => {
    const i = order.indexOf(dow)
    if (i < 0) return { dow, short: DAY_SHORT[dow], programDay: null, tag: null, template: null }
    const programDay = ((i - start + order.length) % order.length) + 1
    const template = byDay[programDay - 1] ?? null
    return { dow, short: DAY_SHORT[dow], programDay, tag: template ? workoutTag(template.name) : null, template }
  })
}

/** The line under the strip for the selected day. */
export function weekDayLine(day: WeekStripDay, trainingDays: readonly number[], now: Date): string {
  const full = day.short
  if (day.programDay === null) return `${full} · Rest day`
  const when = day.programDay === 1 ? dayLabel(firstTrainingDate(trainingDays, now), now) : full
  const parts = [`Day ${day.programDay}`, when]
  if (day.template) {
    parts.push(workoutShortName(day.template.name), `About ${day.template.estimatedDurationMinutes} min`)
  }
  return parts.join(' · ')
}

// ─── Reveal timing ──────────────────────────────────────────────────────────

/** How long the category holds before the plan (a tap skips it). */
export const CATEGORY_HOLD_MS = 3000
/** Category beats, from the reveal's start. */
export const CATEGORY_BEATS = { tiles: 80, tileGap: 60, lit: 520, lead: 820, name: 960, line: 1220 } as const
/** Plan beats, from the plan's start. */
export const PLAN_BEATS = { icon: 0, phases: 700, phaseGap: 520, week: 2300, total: 2650, save: 2900 } as const
/** The lit tile opens into the band over this long; plan beats wait for it. */
export const HANDOFF_MS = 520
export const HANDOFF_PLAN_DELAY_MS = 550
