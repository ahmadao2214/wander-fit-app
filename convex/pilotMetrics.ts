import { internalQuery } from './_generated/server'
import type { Id } from './_generated/dataModel'
import { v } from 'convex/values'

const DAY_MS = 24 * 60 * 60 * 1000
const PILOT_GATE_MIN_COHORT = 10
const PILOT_GATE_RETENTION_THRESHOLD = 0.6

type AgeGroupBucket = '14-17' | '18-35' | '36+' | 'unknown'

interface PilotAthleteSummary {
  userId: Id<'users'>
  ageGroup: AgeGroupBucket
  gppCategoryId: number | null
  intakeCompleted: boolean
  workoutsOpenedInWindow: number
  workoutsCompletedWeek1: number
  workoutsCompletedWeek2: number
  totalCompletedInWindow: number
  retainedWeek2: boolean
  retainedOverall: boolean
}

function parseInternalEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0)
  )
}

/**
 * Authoritative Convex retention scorecard for the >=6/10 2-week Pilot gate.
 *
 * Strictly internal-only (runnable via `npx convex run pilotMetrics:getPilotScorecard`).
 * Includes 0-workout Pilot Athletes in the denominator, excludes internal team
 * accounts (`INTERNAL_EMAILS`) by default, and returns zero PII (opaque userId only).
 */
export const getPilotScorecard = internalQuery({
  args: {
    cohortStartMs: v.optional(v.number()),
    cohortEndMs: v.optional(v.number()),
    windowDays: v.optional(v.number()),
    minCompletedWorkouts: v.optional(v.number()),
    includeInternal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const cohortStartMs = args.cohortStartMs ?? 0
    const cohortEndMs = args.cohortEndMs
    const windowDays = Math.max(1, Math.floor(args.windowDays ?? 14))
    const minCompletedWorkouts = Math.max(1, Math.floor(args.minCompletedWorkouts ?? 2))
    const includeInternal = args.includeInternal ?? false
    const internalEmails = parseInternalEmails(process.env.INTERNAL_EMAILS)

    const allUsers = await ctx.db.query('users').collect()
    const cohortUsers = allUsers.filter((user) => {
      if (user.createdAt < cohortStartMs) return false
      if (cohortEndMs !== undefined && user.createdAt >= cohortEndMs) return false
      if (!includeInternal && internalEmails.has(user.email.trim().toLowerCase())) {
        return false
      }
      return true
    })

    const byAgeGroup: Record<
      AgeGroupBucket,
      { athletes: number; intakeCompleted: number; retainedWeek2: number }
    > = {
      '14-17': { athletes: 0, intakeCompleted: 0, retainedWeek2: 0 },
      '18-35': { athletes: 0, intakeCompleted: 0, retainedWeek2: 0 },
      '36+': { athletes: 0, intakeCompleted: 0, retainedWeek2: 0 },
      unknown: { athletes: 0, intakeCompleted: 0, retainedWeek2: 0 },
    }

    const byGppCategory: Record<string, { athletes: number; retainedWeek2: number }> = {
      '1': { athletes: 0, retainedWeek2: 0 },
      '2': { athletes: 0, retainedWeek2: 0 },
      '3': { athletes: 0, retainedWeek2: 0 },
      '4': { athletes: 0, retainedWeek2: 0 },
      unassigned: { athletes: 0, retainedWeek2: 0 },
    }

    let intakeCompletedCount = 0
    let intakeCompletedRetainedWeek2Count = 0
    let zeroWorkoutCount = 0
    let startedAtLeastOneCount = 0
    let completedWeek1Count = 0
    let retainedWeek2Count = 0
    let retainedOverallCount = 0

    const athletes: PilotAthleteSummary[] = []

    for (const user of cohortUsers) {
      const program = await ctx.db
        .query('user_programs')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first()
      const latestIntake = await ctx.db
        .query('intake_responses')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .order('desc')
        .first()
      const sessions = await ctx.db
        .query('gpp_workout_sessions')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect()

      const intakeCompleted = user.intakeCompletedAt !== undefined
      const anchorMs = user.intakeCompletedAt ?? user.createdAt
      const windowEndMs = anchorMs + windowDays * DAY_MS
      const week1EndMs = anchorMs + 7 * DAY_MS
      const week2EndMs = anchorMs + Math.min(14, windowDays) * DAY_MS

      let workoutsOpenedInWindow = 0
      let workoutsCompletedWeek1 = 0
      let workoutsCompletedWeek2 = 0
      let totalCompletedInWindow = 0

      for (const session of sessions) {
        if (session.startedAt >= anchorMs && session.startedAt < windowEndMs) {
          workoutsOpenedInWindow += 1
        }
        if (session.status === 'completed') {
          const completedAt = session.completedAt ?? session.startedAt
          if (completedAt >= anchorMs && completedAt < windowEndMs) {
            totalCompletedInWindow += 1
          }
          if (completedAt >= anchorMs && completedAt < week1EndMs) {
            workoutsCompletedWeek1 += 1
          } else if (completedAt >= week1EndMs && completedAt < week2EndMs) {
            workoutsCompletedWeek2 += 1
          }
        }
      }

      const retainedWeek2 = workoutsCompletedWeek2 >= 1
      const retainedOverall = totalCompletedInWindow >= minCompletedWorkouts && retainedWeek2

      if (intakeCompleted) intakeCompletedCount += 1
      if (intakeCompleted && retainedWeek2) intakeCompletedRetainedWeek2Count += 1
      if (totalCompletedInWindow === 0) zeroWorkoutCount += 1
      if (workoutsOpenedInWindow >= 1) startedAtLeastOneCount += 1
      if (workoutsCompletedWeek1 >= 1) completedWeek1Count += 1
      if (retainedWeek2) retainedWeek2Count += 1
      if (retainedOverall) retainedOverallCount += 1

      const rawAge = program?.ageGroup ?? latestIntake?.ageGroup
      const ageGroup: AgeGroupBucket =
        rawAge === '14-17' || rawAge === '18-35' || rawAge === '36+' ? rawAge : 'unknown'
      byAgeGroup[ageGroup].athletes += 1
      if (intakeCompleted) byAgeGroup[ageGroup].intakeCompleted += 1
      if (retainedWeek2) byAgeGroup[ageGroup].retainedWeek2 += 1

      const gppCategoryId = program?.gppCategoryId ?? latestIntake?.assignedGppCategoryId
      const categoryKey =
        gppCategoryId && gppCategoryId >= 1 && gppCategoryId <= 4
          ? String(gppCategoryId)
          : 'unassigned'
      byGppCategory[categoryKey].athletes += 1
      if (retainedWeek2) byGppCategory[categoryKey].retainedWeek2 += 1

      athletes.push({
        userId: user._id,
        ageGroup,
        gppCategoryId: gppCategoryId ?? null,
        intakeCompleted,
        workoutsOpenedInWindow,
        workoutsCompletedWeek1,
        workoutsCompletedWeek2,
        totalCompletedInWindow,
        retainedWeek2,
        retainedOverall,
      })
    }

    const week2RetentionRate =
      cohortUsers.length > 0 ? Number((retainedWeek2Count / cohortUsers.length).toFixed(4)) : 0
    const intakeWeek2RetentionRate =
      intakeCompletedCount > 0
        ? Number((intakeCompletedRetainedWeek2Count / intakeCompletedCount).toFixed(4))
        : 0
    const meetsPilotGate =
      intakeCompletedCount >= PILOT_GATE_MIN_COHORT &&
      intakeCompletedRetainedWeek2Count / intakeCompletedCount >= PILOT_GATE_RETENTION_THRESHOLD

    return {
      windowDays,
      minCompletedWorkouts,
      includeInternal,
      totals: {
        totalAthletes: cohortUsers.length,
        intakeCompletedCount,
        intakeCompletedRetainedWeek2Count,
        zeroWorkoutCount,
        startedAtLeastOneCount,
        completedWeek1Count,
        retainedWeek2Count,
        retainedOverallCount,
        week2RetentionRate,
        intakeWeek2RetentionRate,
        meetsPilotGate,
      },
      byAgeGroup,
      byGppCategory,
      athletes,
    }
  },
})
