import { useCallback, useEffect, useRef } from 'react'
import { useConvexAuth, useMutation } from 'convex/react'
import { useClerk } from '@clerk/clerk-expo'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { useAuth } from '../../hooks/useAuth'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { intakeArgs, isComplete } from '../../lib/firstRun'
import { waitFor } from '../../lib/waitFor'

export interface SavePlanResult {
  /** The account already had a program; it was kept and the answers dropped. */
  keptExistingProgram: boolean
}

/**
 * Saves the First Run draft to the signed-in account: creates the Convex
 * user if this is a new account and saves the program with `firstLaunchAt`.
 * Call it once the Clerk session is active. The caller navigates on, then
 * clears the draft, so the reveal never flashes empty.
 */
export function useSavePlan() {
  const { draft } = useFirstRunDraft()
  const { user } = useAuth()
  // The live Clerk object, so the id is right straight after setActive.
  const clerk = useClerk()
  const createUser = useMutation(api.users.createUser)
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
      if (!(await waitFor(() => authed.current))) throw new Error('Sign-in is taking too long. Try again.')

      const clerkUser = clerk.user
      if (!clerkUser) throw new Error('Not signed in.')

      if (!user) {
        try {
          await createUser({
            clerkId: clerkUser.id,
            email: clerkUser.primaryEmailAddress?.emailAddress || account.email || '',
            name: account.name || clerkUser.fullName || clerkUser.firstName || 'Athlete',
            role: 'client',
          })
        } catch (error) {
          // A retry after a dropped connection finds the user already there.
          if (!String((error as Error)?.message).includes('User already exists')) throw error
        }
      }

      const args = intakeArgs(draft.answers, new Date())
      const result = await completeIntake({
        ...args,
        sportId: args.sportId as Id<'sports'>,
        firstLaunchAt: draft.firstLaunchAt,
      })
      return { keptExistingProgram: result.keptExistingProgram }
    },
    [draft, user, clerk, createUser, completeIntake]
  )
}
