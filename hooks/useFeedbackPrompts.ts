import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { isStoreReviewEnabledByEnv, requestNativeStoreReview } from '../lib/storeReview'

/**
 * Coordinates the two strictly decoupled feedback prompts on the Today tab:
 *
 * 1. Private in-app rating sheet (after 2nd completed workout, 45-day cooldown).
 * 2. Native OS store review dialog (after 5th completed workout or 1st phase
 *    check-in, 90-day cooldown, native-only & guarded by
 *    EXPO_PUBLIC_ENABLE_STORE_REVIEW).
 *
 * Prompts only present while the host screen is actively focused (`isFocused`)
 * so background tab updates during workout execution never fire offscreen.
 */
export function useFeedbackPrompts(options: {
  enabled: boolean
  isFocused?: boolean
  suppressPrompts?: boolean
}) {
  const { enabled, isFocused = true, suppressPrompts = false } = options
  const hasFeedbackApi = Boolean(api?.feedback?.getPromptEligibility)

  const eligibility = useQuery(
    api.feedback?.getPromptEligibility as typeof api.feedback.getPromptEligibility,
    enabled && hasFeedbackApi ? {} : 'skip'
  )

  const dismissRatingPrompt = useMutation(
    api.feedback?.dismissRatingPrompt as typeof api.feedback.dismissRatingPrompt
  )
  const recordStoreReviewRequested = useMutation(
    api.feedback?.recordStoreReviewRequested as typeof api.feedback.recordStoreReviewRequested
  )

  const [ratingSheetOpen, setRatingSheetOpen] = useState(false)
  const ratingTriggeredRef = useRef(false)
  const storeReviewSettledRef = useRef(false)
  const storeReviewInFlightRef = useRef(false)
  const isActiveRef = useRef(false)

  isActiveRef.current = Boolean(enabled && isFocused && !suppressPrompts)

  // Clear the live active guard on unmount so an in-flight availability check
  // can never fire the native OS review dialog after the host screen unmounts.
  // A layout effect cleanup runs synchronously in the unmount commit, so no
  // availability promise can resolve between unmount and the guard clearing.
  useLayoutEffect(() => {
    return () => {
      isActiveRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled || !isFocused || suppressPrompts || !eligibility) return
    if (storeReviewInFlightRef.current) return

    const openPrivateRatingIfEligible = () => {
      if (!isActiveRef.current || storeReviewInFlightRef.current) return
      if (eligibility.shouldShowPrivateRatingPrompt && !ratingTriggeredRef.current) {
        ratingTriggeredRef.current = true
        setRatingSheetOpen(true)
      }
    }

    // Attempt native store review independently whenever eligible and enabled.
    // Re-check live focus right before OS invocation; if disabled or unavailable
    // at runtime while still focused, fall through to the private rating prompt.
    if (
      eligibility.shouldRequestStoreReview &&
      !ratingSheetOpen &&
      !storeReviewSettledRef.current &&
      isStoreReviewEnabledByEnv()
    ) {
      storeReviewInFlightRef.current = true
      void (async () => {
        let invoked = false
        try {
          invoked = await requestNativeStoreReview({
            shouldProceed: () => isActiveRef.current && !ratingSheetOpen,
          })
          if (invoked) {
            storeReviewSettledRef.current = true
            try {
              await recordStoreReviewRequested({})
            } catch (error) {
              console.error('Failed to record store review request:', error)
            }
          } else if (isActiveRef.current) {
            // Unavailable on this device/OS while still focused — don't retry
            // native store review on every re-render, and fall through cleanly.
            storeReviewSettledRef.current = true
          }
        } finally {
          storeReviewInFlightRef.current = false
        }

        if (!invoked) {
          openPrivateRatingIfEligible()
        }
      })()
      return
    }

    openPrivateRatingIfEligible()
  }, [
    enabled,
    isFocused,
    suppressPrompts,
    eligibility,
    ratingSheetOpen,
    recordStoreReviewRequested,
  ])

  const handleDismissRatingPrompt = useCallback(() => {
    if (!hasFeedbackApi) return
    void dismissRatingPrompt({}).catch((error) => {
      console.error('Failed to dismiss rating prompt:', error)
    })
  }, [dismissRatingPrompt, hasFeedbackApi])

  return {
    ratingSheetOpen,
    setRatingSheetOpen,
    handleDismissRatingPrompt,
  }
}
