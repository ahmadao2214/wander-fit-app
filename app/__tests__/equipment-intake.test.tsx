import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'

import config from '../../tamagui.config'
import EquipmentScreen from '../(intake)/equipment'
import TrainingDaysScreen from '../(intake)/training-days'
import CommitmentScreen from '../(onboarding)/commitment'
import {
  COMBINED_FLOW_ROUTES,
  COMBINED_FLOW_SCREEN_COUNT,
  COMBINED_FLOW_SCREENS,
} from '../../components/IntakeProgressDots'

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockUseQuery = jest.fn()
const mockCompleteIntake = jest.fn()
const mockCompleteOnboarding = jest.fn()
const mockPush = jest.fn()
const mockReplace = jest.fn()
let mockParams: Record<string, string> = {}

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: (name: string) =>
    name === 'userPrograms.completeIntake' ? mockCompleteIntake : mockCompleteOnboarding,
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      completeIntake: 'userPrograms.completeIntake',
      getCurrentUserProgram: 'userPrograms.getCurrentUserProgram',
    },
    onboarding: {
      getOnboardingState: 'onboarding.getOnboardingState',
      getOnboardingData: 'onboarding.getOnboardingData',
      completeOnboarding: 'onboarding.completeOnboarding',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => mockParams,
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

// The real hook needs a navigation container (useIsFocused)
jest.mock('../../hooks/useSwipeNavigation', () => ({
  useSwipeNavigation: () => ({ panHandlers: {}, translateX: 0 }),
}))

jest.mock('../../hooks/useOnboardingAnalytics', () => ({
  useOnboardingAnalytics: () => ({ trackScreenComplete: jest.fn(), trackSkip: jest.fn() }),
  ONBOARDING_SCREEN_NAMES: { 7: 'commitment' },
}))

jest.mock('../../lib/analytics', () => ({
  analytics: {
    trackCommitmentCompleted: jest.fn(),
    trackOnboardingCompleted: jest.fn(),
  },
}))

// The real button needs a 2s press-and-hold; a plain press is enough here
jest.mock('../../components/onboarding', () => {
  const { Pressable, Text } = require('react-native')
  return {
    CommitmentButton: ({ onCommit, label }: { onCommit: () => void; label: string }) => (
      <Pressable onPress={onCommit} accessibilityRole="button">
        <Text>{label}</Text>
      </Pressable>
    ),
  }
})

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const PRIOR_PARAMS = {
  sportId: 'sport-1',
  ageGroup: '18-35',
  yearsOfExperience: '3',
  trainingDays: '3',
  selectedTrainingDays: '1,3,5',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockParams = { ...PRIOR_PARAMS }
})

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Intake equipment step', () => {
  it('renders the Gym and Home choices', () => {
    render(<EquipmentScreen />, { wrapper: AllTheProviders })

    expect(screen.getByText('I have access to a full gym')).toBeTruthy()
    expect(screen.getByText('I train at home with minimal equipment')).toBeTruthy()
  })

  it('does not continue until a choice is made', () => {
    render(<EquipmentScreen />, { wrapper: AllTheProviders })

    fireEvent.press(screen.getByText('Continue'))

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('forwards the chosen equipmentMode with the earlier answers to season timeline', () => {
    render(<EquipmentScreen />, { wrapper: AllTheProviders })

    fireEvent.press(screen.getByText('I train at home with minimal equipment'))
    fireEvent.press(screen.getByText('Continue'))

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(intake)/season-timeline',
      params: { ...PRIOR_PARAMS, equipmentMode: 'home' },
    })
  })

  it('redirects to the start of intake when earlier answers are missing', () => {
    mockParams = { sportId: 'sport-1' }

    render(<EquipmentScreen />, { wrapper: AllTheProviders })

    expect(mockReplace).toHaveBeenCalledWith('/(intake)/sport')
  })

  it('is reached from training days', () => {
    mockParams = { sportId: 'sport-1', ageGroup: '18-35', yearsOfExperience: '3' }
    render(<TrainingDaysScreen />, { wrapper: AllTheProviders })

    fireEvent.press(screen.getByText('M'))
    fireEvent.press(screen.getByText('Continue'))

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(intake)/equipment' })
    )
  })
})

describe('Combined flow progress constants', () => {
  it('places equipment between training days and season timeline', () => {
    expect(COMBINED_FLOW_SCREEN_COUNT).toBe(10)
    expect(COMBINED_FLOW_SCREENS.EQUIPMENT).toBe(COMBINED_FLOW_SCREENS.TRAINING_DAYS + 1)
    expect(COMBINED_FLOW_SCREENS.SEASON_TIMELINE).toBe(COMBINED_FLOW_SCREENS.EQUIPMENT + 1)
    expect(COMBINED_FLOW_ROUTES[COMBINED_FLOW_SCREENS.EQUIPMENT]).toBe('/(intake)/equipment')
    expect(COMBINED_FLOW_ROUTES[COMBINED_FLOW_SCREENS.COMMITMENT]).toBe('/(onboarding)/commitment')
    expect(COMBINED_FLOW_SCREENS.COMMITMENT).toBe(COMBINED_FLOW_SCREEN_COUNT - 1)
  })
})

describe('Commitment sends equipmentMode to completeIntake', () => {
  const setupQueries = () => {
    mockUseQuery.mockImplementation((name: string) => {
      if (name === 'onboarding.getOnboardingState') return { isRevisit: false }
      if (name === 'onboarding.getOnboardingData') return { preferredDays: 3 }
      if (name === 'userPrograms.getCurrentUserProgram') return null
      return undefined
    })
  }

  it.each(['gym', 'home'] as const)('passes %s through', async (mode) => {
    setupQueries()
    mockParams = { ...PRIOR_PARAMS, weeksUntilSeason: '12', equipmentMode: mode }

    render(<CommitmentScreen />, { wrapper: AllTheProviders })
    fireEvent.press(screen.getByText('I Commit'))

    await waitFor(() => expect(mockCompleteIntake).toHaveBeenCalled())
    expect(mockCompleteIntake).toHaveBeenCalledWith(
      expect.objectContaining({ sportId: 'sport-1', equipmentMode: mode })
    )
  })

  it('omits equipmentMode when the param is missing so the backend default applies', async () => {
    setupQueries()
    mockParams = { ...PRIOR_PARAMS, weeksUntilSeason: '12' }

    render(<CommitmentScreen />, { wrapper: AllTheProviders })
    fireEvent.press(screen.getByText('I Commit'))

    await waitFor(() => expect(mockCompleteIntake).toHaveBeenCalled())
    expect(mockCompleteIntake.mock.calls[0][0].equipmentMode).toBeUndefined()
  })
})
