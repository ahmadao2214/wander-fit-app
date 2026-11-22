import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'

const mockSubmitRating = jest.fn().mockResolvedValue({ ratingId: 'rating_1' })
const mockSubmitBugReport = jest.fn().mockResolvedValue({ bugReportId: 'bug_1' })
const mockSubmitFeatureRequest = jest.fn().mockResolvedValue({ featureRequestId: 'feat_1' })
const mockToastShow = jest.fn()

jest.mock('convex/react', () => ({
  useMutation: (name: string) => {
    if (name === 'submitRating') return mockSubmitRating
    if (name === 'submitBugReport') return mockSubmitBugReport
    if (name === 'submitFeatureRequest') return mockSubmitFeatureRequest
    return jest.fn()
  },
}))

jest.mock('../../../convex/_generated/api', () => ({
  api: {
    feedback: {
      submitRating: 'submitRating',
      submitBugReport: 'submitBugReport',
      submitFeatureRequest: 'submitFeatureRequest',
    },
  },
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('@tamagui/toast', () => ({
  useToastController: () => ({ show: mockToastShow }),
}))

jest.mock('../../../lib/haptics', () => ({
  selectionFeedback: jest.fn(),
}))

jest.mock('../../../lib/analytics', () => ({
  analytics: {
    trackFeedbackSubmitted: jest.fn(),
    getSessionId: jest.fn(() => 'ph_session_abc'),
  },
}))

import { RatingFeedbackSheet } from '../RatingFeedbackSheet'
import { BugReportSheet } from '../BugReportSheet'
import { FeatureRequestSheet } from '../FeatureRequestSheet'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

// Sheet mount + Tamagui animations take ~5s on a cold CI runner.
jest.setTimeout(20000)

describe('Feedback sheets', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('RatingFeedbackSheet', () => {
    it('submits a private 1-5 star rating + optional note, shows toast, and never prompts a store review', async () => {
      const onOpenChange = jest.fn()
      const { getByTestId, queryByText } = render(
        <RatingFeedbackSheet
          open
          onOpenChange={onOpenChange}
          trigger="profile_manual"
          screenRoute="/(athlete)/profile"
        />,
        { wrapper: AllTheProviders }
      )
      await act(async () => {})

      expect(queryByText(/App Store|Google Play/i)).toBeNull()

      fireEvent.press(getByTestId('rating-star-5'))
      fireEvent.changeText(getByTestId('rating-note-input'), 'Super clean workout flow')

      await act(async () => {
        fireEvent.press(getByTestId('rating-submit-button'))
      })

      expect(mockSubmitRating).toHaveBeenCalledTimes(1)
      expect(mockSubmitRating.mock.calls[0][0]).toMatchObject({
        stars: 5,
        note: 'Super clean workout flow',
        trigger: 'profile_manual',
        context: expect.objectContaining({ screenRoute: '/(athlete)/profile' }),
      })
      expect(mockToastShow).toHaveBeenCalledWith('Thanks for the rating!', {
        message: expect.stringContaining('WanderFit team'),
      })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('calls onDismiss when dismissing a post-workout auto-prompt', async () => {
      const onOpenChange = jest.fn()
      const onDismiss = jest.fn()
      const { getByTestId } = render(
        <RatingFeedbackSheet
          open
          onOpenChange={onOpenChange}
          trigger="post_workout_prompt"
          screenRoute="/(athlete)"
          onDismiss={onDismiss}
        />,
        { wrapper: AllTheProviders }
      )
      await act(async () => {})

      fireEvent.press(getByTestId('rating-dismiss-button'))
      expect(onDismiss).toHaveBeenCalledTimes(1)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('records the dismissal when the athlete closes the auto-prompt while a rating is still sending', async () => {
      let rejectSubmit: (error: Error) => void = () => {}
      mockSubmitRating.mockImplementationOnce(
        () => new Promise((_resolve, reject) => (rejectSubmit = reject))
      )
      const onDismiss = jest.fn()
      const { getByTestId, getByLabelText } = render(
        <RatingFeedbackSheet
          open
          onOpenChange={jest.fn()}
          trigger="post_workout_prompt"
          screenRoute="/(athlete)"
          onDismiss={onDismiss}
        />,
        { wrapper: AllTheProviders }
      )
      await act(async () => {})
      fireEvent.press(getByTestId('rating-star-4'))
      await act(async () => {
        fireEvent.press(getByTestId('rating-submit-button'))
      })

      fireEvent.press(getByLabelText('Close'))
      expect(onDismiss).toHaveBeenCalledTimes(1)

      // The send then fails (e.g. the hourly limit); the dismissal still stands
      await act(async () => {
        rejectSubmit(new Error('Too many submissions'))
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  describe('BugReportSheet', () => {
    it("lets the athlete close mid-send, and a late success doesn't close a reopened sheet", async () => {
      let resolveSubmit: (value: unknown) => void = () => {}
      mockSubmitBugReport.mockImplementationOnce(
        () => new Promise((resolve) => (resolveSubmit = resolve))
      )
      const onOpenChange = jest.fn()
      const sheet = (open: boolean) => (
        <BugReportSheet
          open={open}
          onOpenChange={onOpenChange}
          source="profile"
          screenRoute="/(athlete)/profile"
        />
      )
      const { getByTestId, getByLabelText, rerender } = render(sheet(true), {
        wrapper: AllTheProviders,
      })
      await act(async () => {})
      fireEvent.changeText(getByTestId('bug-title-input'), 'Timer froze')
      fireEvent.changeText(getByTestId('bug-details-input'), 'Rest timer stopped at 0:42')
      await act(async () => {
        fireEvent.press(getByTestId('bug-submit-button'))
      })

      // Offline: the send is still pending, but Close still works
      fireEvent.press(getByLabelText('Close'))
      expect(onOpenChange).toHaveBeenCalledWith(false)
      rerender(sheet(false))
      rerender(sheet(true))
      onOpenChange.mockClear()

      await act(async () => {
        resolveSubmit({ bugReportId: 'bug_2' })
      })
      expect(onOpenChange).not.toHaveBeenCalled()
    })

    it('attaches workout context, severity, and PostHog session ID on submit', async () => {
      const onOpenChange = jest.fn()
      const { getByTestId, getByText } = render(
        <BugReportSheet
          open
          onOpenChange={onOpenChange}
          source="workout_execute"
          screenRoute="/(athlete)/workout/execute/[id]"
          workoutContext={{
            gppSessionId: 'sess_1' as any,
            templateId: 'tmpl_1' as any,
            exerciseId: 'ex_1' as any,
            exerciseName: 'Goblet Squat',
          }}
        />,
        { wrapper: AllTheProviders }
      )
      await act(async () => {})

      expect(getByText('Linked to: Goblet Squat')).toBeTruthy()

      fireEvent.changeText(getByTestId('bug-title-input'), 'Too many sets')
      fireEvent.changeText(getByTestId('bug-details-input'), 'Prescribed 6x12 on day 1')
      fireEvent.press(getByTestId('bug-severity-blocking'))

      await act(async () => {
        fireEvent.press(getByTestId('bug-submit-button'))
      })

      expect(mockSubmitBugReport).toHaveBeenCalledTimes(1)
      expect(mockSubmitBugReport.mock.calls[0][0]).toMatchObject({
        title: 'Too many sets',
        details: 'Prescribed 6x12 on day 1',
        severity: 'blocking',
        source: 'workout_execute',
        posthogSessionId: 'ph_session_abc',
        workoutContext: {
          gppSessionId: 'sess_1',
          templateId: 'tmpl_1',
          exerciseId: 'ex_1',
          exerciseName: 'Goblet Squat',
        },
      })
      expect(mockToastShow).toHaveBeenCalledWith('Bug report sent', {
        message: expect.any(String),
      })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('FeatureRequestSheet', () => {
    it('submits selected category, title, and details with confirmation toast only', async () => {
      const onOpenChange = jest.fn()
      const { getByTestId } = render(
        <FeatureRequestSheet open onOpenChange={onOpenChange} screenRoute="/(athlete)/profile" />,
        { wrapper: AllTheProviders }
      )
      await act(async () => {})

      fireEvent.press(getByTestId('feature-category-equipment_gym_home'))
      fireEvent.changeText(getByTestId('feature-title-input'), 'Home dumbbell mode')
      fireEvent.changeText(getByTestId('feature-details-input'), 'Swap barbell moves at home')

      await act(async () => {
        fireEvent.press(getByTestId('feature-submit-button'))
      })

      expect(mockSubmitFeatureRequest).toHaveBeenCalledTimes(1)
      expect(mockSubmitFeatureRequest.mock.calls[0][0]).toMatchObject({
        category: 'equipment_gym_home',
        title: 'Home dumbbell mode',
        details: 'Swap barbell moves at home',
      })
      expect(mockToastShow).toHaveBeenCalledWith('Idea sent!', {
        message: expect.any(String),
      })
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })
})
