import React from 'react'
import { act, renderHook } from '@testing-library/react-native'

let mockEligibility: {
  shouldShowPrivateRatingPrompt: boolean
  shouldRequestStoreReview: boolean
  completedWorkoutsCount: number
} | undefined

const mockDismissRatingPrompt = jest.fn().mockResolvedValue({ ok: true })
const mockRecordStoreReviewRequested = jest.fn().mockResolvedValue({ ok: true })

jest.mock('convex/react', () => ({
  useQuery: (_fn: unknown, args: unknown) => (args === 'skip' ? undefined : mockEligibility),
  useMutation: (name: string) => {
    if (name === 'dismissRatingPrompt') return mockDismissRatingPrompt
    if (name === 'recordStoreReviewRequested') return mockRecordStoreReviewRequested
    return jest.fn()
  },
}))

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    feedback: {
      getPromptEligibility: 'getPromptEligibility',
      dismissRatingPrompt: 'dismissRatingPrompt',
      recordStoreReviewRequested: 'recordStoreReviewRequested',
    },
  },
}))

const mockIsStoreReviewEnabledByEnv = jest.fn(() => false)
const mockRequestNativeStoreReview = jest.fn()

jest.mock('../../../lib/storeReview', () => ({
  isStoreReviewEnabledByEnv: () => mockIsStoreReviewEnabledByEnv(),
  requestNativeStoreReview: (options?: { shouldProceed?: () => boolean }) =>
    mockRequestNativeStoreReview(options),
}))

import { useFeedbackPrompts } from '../../../hooks/useFeedbackPrompts'

describe('useFeedbackPrompts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockEligibility = undefined
    mockIsStoreReviewEnabledByEnv.mockReturnValue(false)
    mockRequestNativeStoreReview.mockResolvedValue(false)
  })

  it('opens the private rating sheet when both prompts are eligible and store review is disabled (web/TestFlight)', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: true,
      shouldRequestStoreReview: true,
      completedWorkoutsCount: 5,
    }
    mockIsStoreReviewEnabledByEnv.mockReturnValue(false)

    const { result } = renderHook(() =>
      useFeedbackPrompts({ enabled: true, isFocused: true })
    )
    await act(async () => {})

    expect(mockRequestNativeStoreReview).not.toHaveBeenCalled()
    expect(result.current.ratingSheetOpen).toBe(true)
  })

  it('falls through to the private rating sheet when native store review returns unavailable at runtime', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: true,
      shouldRequestStoreReview: true,
      completedWorkoutsCount: 5,
    }
    mockIsStoreReviewEnabledByEnv.mockReturnValue(true)
    mockRequestNativeStoreReview.mockResolvedValue(false)

    const { result } = renderHook(() =>
      useFeedbackPrompts({ enabled: true, isFocused: true })
    )
    await act(async () => {})

    expect(mockRequestNativeStoreReview).toHaveBeenCalledTimes(1)
    expect(mockRecordStoreReviewRequested).not.toHaveBeenCalled()
    expect(result.current.ratingSheetOpen).toBe(true)
  })

  it('invokes native store review without stacking the private rating sheet when enabled and available', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: true,
      shouldRequestStoreReview: true,
      completedWorkoutsCount: 5,
    }
    mockIsStoreReviewEnabledByEnv.mockReturnValue(true)
    mockRequestNativeStoreReview.mockResolvedValue(true)

    const { result } = renderHook(() =>
      useFeedbackPrompts({ enabled: true, isFocused: true })
    )
    await act(async () => {})

    expect(mockRequestNativeStoreReview).toHaveBeenCalledTimes(1)
    expect(mockRecordStoreReviewRequested).toHaveBeenCalledTimes(1)
    expect(result.current.ratingSheetOpen).toBe(false)
  })

  it('does not trigger either prompt while the screen is unfocused, then triggers once focused', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: true,
      shouldRequestStoreReview: false,
      completedWorkoutsCount: 2,
    }

    const { result, rerender } = renderHook(
      ({ isFocused }: { isFocused: boolean }) =>
        useFeedbackPrompts({ enabled: true, isFocused }),
      { initialProps: { isFocused: false } }
    )
    await act(async () => {})

    expect(result.current.ratingSheetOpen).toBe(false)

    rerender({ isFocused: true })
    await act(async () => {})

    expect(result.current.ratingSheetOpen).toBe(true)
  })

  it('cancels native OS review if the screen blurs while availability is awaiting, and retries cleanly on refocus', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: false,
      shouldRequestStoreReview: true,
      completedWorkoutsCount: 5,
    }
    mockIsStoreReviewEnabledByEnv.mockReturnValue(true)

    let resolveAvailability!: (available: boolean) => void
    let capturedShouldProceed: (() => boolean) | undefined
    mockRequestNativeStoreReview.mockImplementationOnce(
      (options?: { shouldProceed?: () => boolean }) => {
        capturedShouldProceed = options?.shouldProceed
        return new Promise<boolean>((resolve) => {
          resolveAvailability = (available: boolean) => {
            if (!available) return resolve(false)
            if (capturedShouldProceed && !capturedShouldProceed()) return resolve(false)
            resolve(true)
          }
        })
      }
    )

    const { rerender } = renderHook(
      ({ isFocused }: { isFocused: boolean }) =>
        useFeedbackPrompts({ enabled: true, isFocused }),
      { initialProps: { isFocused: true } }
    )

    // Blur while availability check is still in flight
    rerender({ isFocused: false })
    await act(async () => {
      resolveAvailability(true)
    })

    expect(mockRecordStoreReviewRequested).not.toHaveBeenCalled()

    // Refocus later: native review retries and completes cleanly
    mockRequestNativeStoreReview.mockResolvedValueOnce(true)
    rerender({ isFocused: true })
    await act(async () => {})

    expect(mockRequestNativeStoreReview).toHaveBeenCalledTimes(2)
    expect(mockRecordStoreReviewRequested).toHaveBeenCalledTimes(1)
  })

  it('does not open the private rating sheet when eligibility updates while a native store review attempt is still in flight', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: true,
      shouldRequestStoreReview: true,
      completedWorkoutsCount: 5,
    }
    mockIsStoreReviewEnabledByEnv.mockReturnValue(true)

    let resolveStoreReview!: (invoked: boolean) => void
    mockRequestNativeStoreReview.mockImplementationOnce(
      () =>
        new Promise<boolean>((resolve) => {
          resolveStoreReview = resolve
        })
    )

    const { result, rerender } = renderHook(
      ({ tick }: { tick: number }) => {
        void tick
        return useFeedbackPrompts({ enabled: true, isFocused: true })
      },
      { initialProps: { tick: 0 } }
    )

    // Simulate live Convex query re-emitting eligibility while native request is still pending
    mockEligibility = { ...mockEligibility }
    rerender({ tick: 1 })
    await act(async () => {})

    expect(result.current.ratingSheetOpen).toBe(false)
    expect(mockRequestNativeStoreReview).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveStoreReview(true)
    })

    expect(result.current.ratingSheetOpen).toBe(false)
    expect(mockRecordStoreReviewRequested).toHaveBeenCalledTimes(1)
  })

  it('cancels native OS review if the host unmounts while availability is awaiting', async () => {
    mockEligibility = {
      shouldShowPrivateRatingPrompt: false,
      shouldRequestStoreReview: true,
      completedWorkoutsCount: 5,
    }
    mockIsStoreReviewEnabledByEnv.mockReturnValue(true)

    let resolveAvailability!: (available: boolean) => void
    let shouldProceedAtResolve: boolean | undefined
    mockRequestNativeStoreReview.mockImplementationOnce(
      (options?: { shouldProceed?: () => boolean }) =>
        new Promise<boolean>((resolve) => {
          resolveAvailability = (available: boolean) => {
            shouldProceedAtResolve = options?.shouldProceed?.()
            if (!available || !shouldProceedAtResolve) return resolve(false)
            resolve(true)
          }
        })
    )

    const { unmount } = renderHook(() =>
      useFeedbackPrompts({ enabled: true, isFocused: true })
    )

    unmount()
    await act(async () => {
      resolveAvailability(true)
    })

    expect(shouldProceedAtResolve).toBe(false)
    expect(mockRecordStoreReviewRequested).not.toHaveBeenCalled()
  })
})
