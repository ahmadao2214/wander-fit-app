/**
 * @deprecated Compatibility path for installed builds only.
 *
 * Builds from before the trainer/client screens were removed call
 * `api.workoutSessions.getHistory` from the History tab. It now serves the
 * caller's GPP sessions, which is what that tab renders. Those builds read
 * `totalDuration` and fall back to `workout.name`, so both are added here
 * under the old names. Delete this file once no installed build older than
 * that change is in use.
 */
import { query } from './_generated/server'
import { v } from 'convex/values'
import { loadHistory } from './gppWorkoutSessions'

export const getHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const sessions = await loadHistory(ctx, args.limit || 20)
    return sessions.map((session) => ({
      ...session,
      totalDuration: session.totalDurationSeconds,
      workout: { name: session.templateName },
    }))
  },
})
