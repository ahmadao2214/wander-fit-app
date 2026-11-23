import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

jest.mock('convex/react', () => ({
  useQuery: (name: string) => {
    if (name === 'getCurrentProgramState') {
      return {
        phase: 'GPP',
        week: 1,
        day: 1,
        skillLevel: 'Novice',
        gppCategoryId: 2,
        sportName: 'Basketball',
      }
    }
    if (name === 'getIntakeHistory') return []
    if (name === 'getCoreLiftExercises') return []
    return undefined
  },
  useMutation: () => jest.fn().mockResolvedValue({}),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'getCurrentProgramState',
      getIntakeHistory: 'getIntakeHistory',
    },
    userMaxes: { getCoreLiftExercises: 'getCoreLiftExercises' },
    feedback: {
      submitRating: 'submitRating',
      submitBugReport: 'submitBugReport',
      submitFeatureRequest: 'submitFeatureRequest',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useIsFocused: () => true,
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { _id: 'user_1', name: 'Test Athlete', email: 'athlete@example.com' },
    isLoading: false,
  }),
}))

jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))
jest.mock('../../components/OneRepMaxSheet', () => ({ OneRepMaxSheet: () => null }))

import ProfilePage from '../(athlete)/profile'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Profile — Feedback & support', () => {
  it('renders Rate, Report a bug, and Request a feature rows without any My feedback history list', () => {
    const { getByTestId, getByText, queryByText } = render(<ProfilePage />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Feedback & support')).toBeTruthy()
    expect(getByTestId('feedback-row-rate')).toBeTruthy()
    expect(getByTestId('feedback-row-bug')).toBeTruthy()
    expect(getByTestId('feedback-row-feature')).toBeTruthy()

    // Decision 5b-B: submit + confirmation toast only, no athlete history view
    expect(queryByText(/my feedback|my submissions|past requests/i)).toBeNull()
  })

  it('opens each feedback sheet when its row is pressed', async () => {
    const { getByTestId, findByTestId } = render(<ProfilePage />, {
      wrapper: AllTheProviders,
    })

    await act(async () => {
      fireEvent.press(getByTestId('feedback-row-rate'))
    })
    expect(await findByTestId('rating-feedback-sheet')).toBeTruthy()

    await act(async () => {
      fireEvent.press(getByTestId('feedback-row-bug'))
    })
    expect(await findByTestId('bug-report-sheet')).toBeTruthy()

    await act(async () => {
      fireEvent.press(getByTestId('feedback-row-feature'))
    })
    expect(await findByTestId('feature-request-sheet')).toBeTruthy()
  })
})
