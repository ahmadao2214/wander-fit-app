import { useEffect } from 'react'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import type { FirstRunStep } from '../../lib/firstRunDraft'

/** Records the step when its screen opens, so a relaunch resumes here. */
export function useReachStep(step: FirstRunStep) {
  const { draft, reach } = useFirstRunDraft()
  const loaded = draft !== null
  const current = draft?.lastStep
  useEffect(() => {
    if (loaded && current !== step) void reach(step)
  }, [loaded, current, step, reach])
}
