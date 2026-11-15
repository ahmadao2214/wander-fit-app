import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { firstRunDraft } from '../lib/firstRunStorage'
import type { FirstRunAnswers } from '../lib/firstRun'
import type { FirstRunDraft, FirstRunStep } from '../lib/firstRunDraft'

/**
 * The First Run draft for the screens: null until it has loaded, then the
 * answers so far. Every screen reading it sees the same draft.
 */
export function useFirstRunDraft() {
  const draft: FirstRunDraft | null = useSyncExternalStore(
    firstRunDraft.subscribe,
    firstRunDraft.current,
    firstRunDraft.current
  )

  useEffect(() => {
    if (!firstRunDraft.current()) void firstRunDraft.load()
  }, [])

  const save = useCallback(
    (answers: Partial<FirstRunAnswers>, lastStep?: FirstRunStep) =>
      firstRunDraft.save({ answers, lastStep }),
    []
  )
  const reach = useCallback((lastStep: FirstRunStep) => firstRunDraft.save({ lastStep }), [])
  const clear = useCallback(() => firstRunDraft.clear(), [])

  return { draft, save, reach, clear }
}
