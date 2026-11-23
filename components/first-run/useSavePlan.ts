import { useCallback, useEffect, useRef } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'
import { useClerk } from '@clerk/clerk-expo'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAuth } from '../../hooks/useAuth'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { intakeArgs, isComplete } from '../../lib/firstRun'
import { TERMS_VERSION } from '../../lib/legal'
import { waitFor } from '../../lib/waitFor'

export interface SavePlanResult {
  /** The account already had a program; it was kept and the answers dropped. */
  keptExistingProgram: boolean
}

/**
 * Saves the First Run draft to the signed-in account: creates the Convex
 * user if this is a new account (recording the athlete's terms acceptance),
 * and saves the program with `firstLaunchAt`. The caller runs it only after
 * the athlete ticks the acceptance checkbox.
 * Call it once the Clerk session is active. The caller navigates on, then
 * clears the draft, so the reveal never flashes empty.
 */
export function useSavePlan() {
  const { draft } = useFirstRunDraft()
  const { user } = useAuth()
  // The live Clerk object, so the id is right straight after setActive.
  const clerk = useClerk()
  const createUser = useMutation(api.users.createUser)
  const recordTermsAcceptance = useMutation(api.users.recordTermsAcceptance)
  const completeIntake = useMutation(api.userPrograms.completeIntake)

  // Convex checks the caller's identity, so wait for the new session's token.
  const { isAuthenticated } = useConvexAuth()
  const authed = useRef(isAuthenticated)
  useEffect(() => {
    authed.current = isAuthenticated
  }, [isAuthenticated])

  return useCallback(
    async (account: { email?: string; name?: string }): Promise<SavePlanResult> => {
      if (!draft || !isComplete(draft.answers)) throw new Error('Your answers are incomplete.')
      if (!(await waitFor(() => authed.current)))
        throw new Error('Sign-in is taking too long. Try again.')

      const clerkUser = clerk.user
      if (!clerkUser) throw new Error('Not signed in.')

      // Only the age group goes with the acceptance, never a birth date.
      const termsAcceptance = { termsVersion: TERMS_VERSION, ageGroup: draft.answers.ageGroup }
      let created = false
      if (!user) {
        try {
          await createUser({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || account.email || '',
            name: account.name || clerkUser.fullName || clerkUser.firstName || 'Athlete',
            role: 'client',
            termsAcceptance,
          })
          created = true
        } catch (error) {
          // A retry after a dropped connection finds the user already there.
          if (!String((error as Error)?.message).includes('User already exists')) throw error
        }
      }
      // An account made before this save (or on a retry) records it here.
      if (!created) await recordTermsAcceptance({ termsAcceptance })

      const args = intakeArgs(draft.answers, new Date())
      const result = await completeIntake({
        ...args,
        sportId: args.sportId as Id<'sports'>,
        firstLaunchAt: draft.firstLaunchAt,
      })
      return { keptExistingProgram: result.keptExistingProgram }
    },
    [draft, user, clerk, createUser, recordTermsAcceptance, completeIntake]
  )
}
