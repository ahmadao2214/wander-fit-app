import {
  MS_PER_DAY,
  PRIVATE_RATING_COOLDOWN_MS,
  PRIVATE_RATING_MAX_DISMISSALS,
  PRIVATE_RATING_MIN_WORKOUTS,
  STORE_REVIEW_COOLDOWN_MS,
  STORE_REVIEW_MIN_REASSESSMENTS,
  STORE_REVIEW_MIN_WORKOUTS,
  evaluateFeedbackPrompts,
  isPrivateRatingEligible,
  isStoreReviewEligible,
  type FeedbackPromptStateSnapshot,
} from '../feedbackEligibility'

const NOW = 1_760_000_000_000

const emptyState = (): FeedbackPromptStateSnapshot => ({
  ratingDismissCount: 0,
  storeReviewRequestCount: 0,
})

describe('isPrivateRatingEligible', () => {
  it('stays false before the 2nd completed workout', () => {
    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: PRIVATE_RATING_MIN_WORKOUTS - 1,
        reassessmentPending: false,
        promptState: null,
        now: NOW,
      })
    ).toBe(false)
  })

  it('triggers on the 2nd completed workout when no prompt state exists', () => {
    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: PRIVATE_RATING_MIN_WORKOUTS,
        reassessmentPending: false,
        promptState: null,
        now: NOW,
      })
    ).toBe(true)
  })

  it('suppresses when a phase check-in (reassessment) is pending', () => {
    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: 4,
        reassessmentPending: true,
        promptState: null,
        now: NOW,
      })
    ).toBe(false)
  })

  it('respects the 45-day cooldown after submission or dismissal', () => {
    const justBeforeCooldown = NOW - PRIVATE_RATING_COOLDOWN_MS + 1000
    const atCooldown = NOW - PRIVATE_RATING_COOLDOWN_MS

    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: 5,
        reassessmentPending: false,
        promptState: { ...emptyState(), lastRatingSubmittedAt: justBeforeCooldown },
        now: NOW,
      })
    ).toBe(false)

    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: 5,
        reassessmentPending: false,
        promptState: {
          ...emptyState(),
          lastRatingDismissedAt: justBeforeCooldown,
          ratingDismissCount: 1,
        },
        now: NOW,
      })
    ).toBe(false)

    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: 5,
        reassessmentPending: false,
        promptState: { ...emptyState(), lastRatingSubmittedAt: atCooldown },
        now: NOW,
      })
    ).toBe(true)
  })

  it('stops auto-prompting after 3 dismissals', () => {
    expect(
      isPrivateRatingEligible({
        completedWorkoutsCount: 20,
        reassessmentPending: false,
        promptState: {
          ...emptyState(),
          lastRatingDismissedAt: NOW - 100 * MS_PER_DAY,
          ratingDismissCount: PRIVATE_RATING_MAX_DISMISSALS,
        },
        now: NOW,
      })
    ).toBe(false)
  })
})

describe('isStoreReviewEligible (strictly independent of private rating state)', () => {
  it('stays false before 5 workouts and 0 reassessments', () => {
    expect(
      isStoreReviewEligible({
        completedWorkoutsCount: STORE_REVIEW_MIN_WORKOUTS - 1,
        completedReassessmentsCount: 0,
        reassessmentPending: false,
        now: NOW,
      })
    ).toBe(false)
  })

  it('triggers on 5 completed workouts or 1 completed reassessment', () => {
    expect(
      isStoreReviewEligible({
        completedWorkoutsCount: STORE_REVIEW_MIN_WORKOUTS,
        completedReassessmentsCount: 0,
        reassessmentPending: false,
        now: NOW,
      })
    ).toBe(true)

    expect(
      isStoreReviewEligible({
        completedWorkoutsCount: 3,
        completedReassessmentsCount: STORE_REVIEW_MIN_REASSESSMENTS,
        reassessmentPending: false,
        now: NOW,
      })
    ).toBe(true)
  })

  it('suppresses when reassessment is pending', () => {
    expect(
      isStoreReviewEligible({
        completedWorkoutsCount: 10,
        completedReassessmentsCount: 1,
        reassessmentPending: true,
        now: NOW,
      })
    ).toBe(false)
  })

  it('enforces 90-day cooldown between native store review requests', () => {
    expect(
      isStoreReviewEligible({
        completedWorkoutsCount: 12,
        completedReassessmentsCount: 1,
        reassessmentPending: false,
        lastStoreReviewRequestedAt: NOW - STORE_REVIEW_COOLDOWN_MS + 1000,
        now: NOW,
      })
    ).toBe(false)

    expect(
      isStoreReviewEligible({
        completedWorkoutsCount: 12,
        completedReassessmentsCount: 1,
        reassessmentPending: false,
        lastStoreReviewRequestedAt: NOW - STORE_REVIEW_COOLDOWN_MS,
        now: NOW,
      })
    ).toBe(true)
  })
})

describe('evaluateFeedbackPrompts', () => {
  it('computes store review eligibility independently even when private rating is also eligible or just submitted', () => {
    const untouchedAtFive = evaluateFeedbackPrompts({
      completedWorkoutsCount: 5,
      completedReassessmentsCount: 0,
      reassessmentPending: false,
      promptState: null,
      now: NOW,
    })
    expect(untouchedAtFive).toEqual({
      shouldShowPrivateRatingPrompt: true,
      shouldRequestStoreReview: true,
    })

    const justRatedAtFive = evaluateFeedbackPrompts({
      completedWorkoutsCount: 5,
      completedReassessmentsCount: 0,
      reassessmentPending: false,
      promptState: {
        ...emptyState(),
        lastRatingSubmittedAt: NOW - 1000,
      },
      now: NOW,
    })
    expect(justRatedAtFive).toEqual({
      shouldShowPrivateRatingPrompt: false,
      shouldRequestStoreReview: true,
    })
  })
})
