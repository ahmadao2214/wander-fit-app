import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockUseQuery = jest.fn()
const mockUseMutation = jest.fn()
const mockPush = jest.fn()
const mockReplace = jest.fn()
const mockBack = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation,
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getReassessmentStatus: 'mocked-getReassessmentStatus',
      completeReassessment: 'mocked-completeReassessment',
    },
    userMaxes: {
      getCoreLiftExercises: 'mocked-getCoreLiftExercises',
      setMultipleMaxes: 'mocked-setMultipleMaxes',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    difficulty: 'just_right',
    energy: 'moderate',
    notes: '',
    maxesUpdated: 'false',
  }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isLoading: false,
  }),
}))

jest.mock('react-native-reanimated', () => {
  const View = require('react-native').View
  return {
    __esModule: true,
    default: {
      View,
      createAnimatedComponent: (c: any) => c,
    },
    FadeInUp: { delay: () => ({ duration: () => ({}) }) },
    BounceIn: { delay: () => ({}) },
    ZoomIn: { delay: () => ({ duration: () => ({}) }) },
  }
})

jest.mock('../../components/workout/ConfettiEffect', () => ({
  ConfettiEffect: () => null,
}))

// ─────────────────────────────────────────────────────────────────────────────

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

const MOCK_REASSESSMENT_STATUS = {
  reassessmentPending: true,
  pendingForPhase: 'GPP',
  completionStats: {
    expected: 16,
    completed: 14,
    completionRate: 0.875,
    weeksPerPhase: 4,
  },
  nextPhase: 'SPP',
  isFullCycleComplete: false,
  currentSkillLevel: 'Novice',
  canUpgradeSkillLevel: true,
  nextSkillLevel: 'Moderate',
  completedReassessments: 0,
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Celebration Screen
// ─────────────────────────────────────────────────────────────────────────────

import CelebrationScreen from '../(reassessment)/celebration'

describe('CelebrationScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockPush.mockReset()
    mockReplace.mockReset()
  })

  it('shows loading spinner while query loads', () => {
    mockUseQuery.mockReturnValue(undefined)

    const { getByText } = render(<CelebrationScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Loading...')).toBeTruthy()
  })

  it('renders phase name when reassessment is pending', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<CelebrationScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('YOU COMPLETED GPP!')).toBeTruthy()
  })

  it('renders completion stats', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<CelebrationScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('14')).toBeTruthy() // workouts
    expect(getByText('88%')).toBeTruthy() // completion rate
    expect(getByText('4')).toBeTruthy() // weeks
  })

  it('has a Continue to Check-In button', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<CelebrationScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Continue to Check-In')).toBeTruthy()
  })

  it('navigates to self-assessment on Continue press', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<CelebrationScreen />, {
      wrapper: AllTheProviders,
    })

    fireEvent.press(getByText('Continue to Check-In'))
    expect(mockPush).toHaveBeenCalledWith('/(reassessment)/self-assessment')
  })

  it('redirects to dashboard when no pending reassessment', () => {
    mockUseQuery.mockReturnValue({
      ...MOCK_REASSESSMENT_STATUS,
      reassessmentPending: false,
    })

    render(<CelebrationScreen />, { wrapper: AllTheProviders })

    expect(mockReplace).toHaveBeenCalledWith('/(athlete)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 2: Self-Assessment Screen
// ─────────────────────────────────────────────────────────────────────────────

import SelfAssessmentScreen from '../(reassessment)/self-assessment'

describe('SelfAssessmentScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockPush.mockReset()
  })

  it('renders 4 difficulty option cards', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<SelfAssessmentScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Too Easy')).toBeTruthy()
    expect(getByText('Just Right')).toBeTruthy()
    expect(getByText('Challenging')).toBeTruthy()
    expect(getByText('Too Hard')).toBeTruthy()
  })

  it('renders energy level options', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<SelfAssessmentScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Low')).toBeTruthy()
    expect(getByText('Moderate')).toBeTruthy()
    expect(getByText('High')).toBeTruthy()
  })

  it('has Continue button', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<SelfAssessmentScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Continue')).toBeTruthy()
  })

  it('renders the phase name in the header', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<SelfAssessmentScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText(/GPP experience/)).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: Results Screen
// ─────────────────────────────────────────────────────────────────────────────

import ResultsScreen from '../(reassessment)/results'

describe('ResultsScreen', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockPush.mockReset()
    mockUseMutation.mockReset()
  })

  it('renders summary cards', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<ResultsScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Phase Completed')).toBeTruthy()
    expect(getByText('Difficulty Rating')).toBeTruthy()
    expect(getByText('1RM Maxes')).toBeTruthy()
  })

  it('shows next phase info', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<ResultsScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Next up: SPP')).toBeTruthy()
  })

  it('shows skill upgrade section when eligible', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<ResultsScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('SKILL UPGRADE')).toBeTruthy()
    expect(getByText('Novice → Moderate')).toBeTruthy()
  })

  it('does NOT show skill upgrade when not eligible', () => {
    mockUseQuery.mockReturnValue({
      ...MOCK_REASSESSMENT_STATUS,
      canUpgradeSkillLevel: false,
      nextSkillLevel: null,
    })

    const { queryByText } = render(<ResultsScreen />, {
      wrapper: AllTheProviders,
    })

    expect(queryByText('SKILL UPGRADE')).toBeNull()
  })

  it('has a start next phase button', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)

    const { getByText } = render(<ResultsScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('Start SPP')).toBeTruthy()
  })
})
