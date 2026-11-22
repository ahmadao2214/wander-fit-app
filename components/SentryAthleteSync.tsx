import { useEffect } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import { setSentryAthleteContext } from '../lib/sentry'

/**
 * Keeps Sentry's scope aligned with the signed-in athlete using only their
 * opaque Clerk ID (never email, name, or phone) and clears context on sign-out.
 */
export function SentryAthleteSync() {
  const { isSignedIn, userId } = useAuth()

  useEffect(() => {
    setSentryAthleteContext(isSignedIn && userId ? userId : null)
  }, [isSignedIn, userId])

  return null
}

export default SentryAthleteSync
