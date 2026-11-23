import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()
crons.interval(
  'Expire waitlist rate limits',
  { minutes: 1 },
  internal.waitlist.pruneExpiredRateLimits
)
export default crons
