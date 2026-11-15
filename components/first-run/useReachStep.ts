import { useCallback } from 'react'
import { useFocusEffect } from 'expo-router'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import type { FirstRunStep } from '../../lib/firstRunDraft'

/**
 * Records the step when its screen comes into focus, so a relaunch resumes
 * there. Only on focus: earlier screens stay mounted under the stack, and
 * reacting to every draft change made them fight over the step.
 */
export function useReachStep(step: FirstRunStep) {
  const { reach } = useFirstRunDraft()
  useFocusEffect(
    useCallback(() => {
      void reach(step)
    }, [reach, step])
  )
}
