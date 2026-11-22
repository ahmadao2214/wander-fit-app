import { useCallback, useRef, useSyncExternalStore } from 'react'
import { useFocusEffect } from 'expo-router'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { analytics, FIRST_RUN_STEP_INDEX } from '../../lib/analytics'
import type { FirstRunStep } from '../../lib/firstRunDraft'

/**
 * Records the step when its screen comes into focus, so a relaunch resumes
 * there. Only on focus: earlier screens stay mounted under the stack, and
 * reacting to every draft change made them fight over the step.
 * Telemetry fires once per mount so revisiting a still-mounted screen does not
 * emit duplicate `first_run_step_viewed` events. A view seen before capture is
 * ready (cold reload while auth loads) is sent once capture becomes ready.
 */
export function useReachStep(step: FirstRunStep) {
  const { reach } = useFirstRunDraft()
  const trackedRef = useRef(false)
  const captureReady = useSyncExternalStore(
    analytics.subscribeCaptureReady,
    () => analytics.isCaptureReady(),
    () => analytics.isCaptureReady()
  )

  useFocusEffect(
    useCallback(() => {
      void reach(step)
      if (captureReady && !trackedRef.current) {
        trackedRef.current = true
        analytics.trackFirstRunStepViewed({
          step,
          step_index: FIRST_RUN_STEP_INDEX[step],
        })
      }
    }, [reach, step, captureReady])
  )
}
