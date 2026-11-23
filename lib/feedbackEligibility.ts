/**
 * Pure eligibility logic for WanderFit's dual-track feedback prompts:
 *
 * 1. Private In-App Rating (stored in Convex `athlete_ratings`)
 *    - Triggers after the 2nd completed workout to reach active Pilot Athletes early.
 *    - Respects a 45-day cooldown and caps auto-prompts after 3 dismissals.
 *
 * 2. Native Store Review (Apple SKStoreReviewController / Google Play In-App Review)
 *    - Strictly DECOUPLED from private star ratings, sentiment, and private prompt state
 *      to comply with Apple App Store Guidelines and Google Play Review Policy (zero
 *      pre-screening, star-gating, or rating-driven suppression).
 *    - Eligible purely on objective engagement milestones (5th completed workout OR
 *      1st completed phase check-in) and its own 90-day native request cooldown.
 *    - Dialog collisions (not showing two sheets simultaneously on the same render)
 *      are handled purely in UI presentation (`hooks/useFeedbackPrompts.ts`).
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000

export const PRIVATE_RATING_MIN_WORKOUTS = 2
export const PRIVATE_RATING_COOLDOWN_MS = 45 * MS_PER_DAY
export const PRIVATE_RATING_MAX_DISMISSALS = 3

export const STORE_REVIEW_MIN_WORKOUTS = 5
export const STORE_REVIEW_MIN_REASSESSMENTS = 1
export const STORE_REVIEW_COOLDOWN_MS = 90 * MS_PER_DAY

export interface FeedbackPromptStateSnapshot {
  lastRatingPromptedAt?: number
  lastRatingSubmittedAt?: number
  lastRatingDismissedAt?: number
  ratingDismissCount: number
  lastStoreReviewRequestedAt?: number
  storeReviewRequestCount: number
}

export interface PrivateRatingEligibilityInput {
  completedWorkoutsCount: number
  reassessmentPending: boolean
  promptState: FeedbackPromptStateSnapshot | null
  now: number
}

/**
 * Store review eligibility input intentionally accepts ONLY objective milestones
 * and native store-review cooldown state — zero star rating, sentiment, or
 * private-rating prompt state.
 */
export interface StoreReviewEligibilityInput {
  completedWorkoutsCount: number
  completedReassessmentsCount: number
  reassessmentPending: boolean
  lastStoreReviewRequestedAt?: number
  now: number
}

export function isPrivateRatingEligible(input: PrivateRatingEligibilityInput): boolean {
  const { completedWorkoutsCount, reassessmentPending, promptState, now } = input

  if (reassessmentPending) return false
  if (completedWorkoutsCount < PRIVATE_RATING_MIN_WORKOUTS) return false

  if (!promptState) return true

  if (promptState.ratingDismissCount >= PRIVATE_RATING_MAX_DISMISSALS) {
    return false
  }

  const lastInteractionAt = Math.max(
    promptState.lastRatingSubmittedAt ?? 0,
    promptState.lastRatingDismissedAt ?? 0
  )
  if (lastInteractionAt > 0 && now - lastInteractionAt < PRIVATE_RATING_COOLDOWN_MS) {
    return false
  }

  return true
}

export function isStoreReviewEligible(input: StoreReviewEligibilityInput): boolean {
  const {
    completedWorkoutsCount,
    completedReassessmentsCount,
    reassessmentPending,
    lastStoreReviewRequestedAt,
    now,
  } = input

  if (reassessmentPending) return false

  const reachedMilestone =
    completedWorkoutsCount >= STORE_REVIEW_MIN_WORKOUTS ||
    completedReassessmentsCount >= STORE_REVIEW_MIN_REASSESSMENTS
  if (!reachedMilestone) return false

  if (
    lastStoreReviewRequestedAt !== undefined &&
    now - lastStoreReviewRequestedAt < STORE_REVIEW_COOLDOWN_MS
  ) {
    return false
  }

  return true
}

export function evaluateFeedbackPrompts(input: {
  completedWorkoutsCount: number
  completedReassessmentsCount: number
  reassessmentPending: boolean
  promptState: FeedbackPromptStateSnapshot | null
  now: number
}): {
  shouldShowPrivateRatingPrompt: boolean
  shouldRequestStoreReview: boolean
} {
  const shouldShowPrivateRatingPrompt = isPrivateRatingEligible({
    completedWorkoutsCount: input.completedWorkoutsCount,
    reassessmentPending: input.reassessmentPending,
    promptState: input.promptState,
    now: input.now,
  })

  const shouldRequestStoreReview = isStoreReviewEligible({
    completedWorkoutsCount: input.completedWorkoutsCount,
    completedReassessmentsCount: input.completedReassessmentsCount,
    reassessmentPending: input.reassessmentPending,
    lastStoreReviewRequestedAt: input.promptState?.lastStoreReviewRequestedAt,
    now: input.now,
  })

  return {
    shouldShowPrivateRatingPrompt,
    shouldRequestStoreReview,
  }
}
