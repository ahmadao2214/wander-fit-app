import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
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
let mockReduceMotion = false
let mockConfettiRenders = 0

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
    useReducedMotion: () => mockReduceMotion,
  }
})

jest.mock('../../components/workout/ConfettiEffect', () => ({
  ConfettiEffect: () => {
    mockConfettiRenders++
    return null
  },
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
    blockStartedAt: new Date(2026, 9, 19).getTime(),
  },
  nextPhase: 'SPP',
  isFullCycleComplete: false,
  currentSkillLevel: 'Novice',
  canUpgradeSkillLevel: true,
  nextSkillLevel: 'Moderate',
  completedReassessments: 0,
}

const withSessions = (completed: number) => ({
  ...MOCK_REASSESSMENT_STATUS,
  completionStats: {
    ...MOCK_REASSESSMENT_STATUS.completionStats,
    completed,
    completionRate: completed / 16,
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 1: Block recap (design audit F04: zero, partial and full)
// ─────────────────────────────────────────────────────────────────────────────

import CelebrationScreen from '../(reassessment)/celebration'

describe('CelebrationScreen (block recap)', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockReduceMotion = false
    mockConfettiRenders = 0
  })

  it('shows loading spinner while query loads', () => {
    mockUseQuery.mockReturnValue(undefined)
    const { getByText } = render(<CelebrationScreen />, { wrapper: AllTheProviders })
    expect(getByText('Loading...')).toBeTruthy()
  })

  it('zero sessions: no congratulations and no confetti (regression)', () => {
    mockUseQuery.mockReturnValue(withSessions(0))
    const { getByText, queryByText, getByTestId } = render(<CelebrationScreen />, {
      wrapper: AllTheProviders,
    })
    expect(getByTestId('block-recap-none')).toBeTruthy()
    expect(getByText('Your GPP block is over')).toBeTruthy()
    expect(getByText('0 of 16 sessions')).toBeTruthy()
    expect(getByText('No sessions were logged in this block.')).toBeTruthy()
    expect(queryByText(/completed|great work|%/i)).toBeNull()
    expect(mockConfettiRenders).toBe(0)
  })

  it('some sessions: states the count, with no confetti', () => {
    mockUseQuery.mockReturnValue(withSessions(14))
    const { getByText } = render(<CelebrationScreen />, { wrapper: AllTheProviders })
    expect(getByText('Your GPP block is over')).toBeTruthy()
    expect(getByText('14 of 16 sessions')).toBeTruthy()
    expect(mockConfettiRenders).toBe(0)
  })

  it('every session: celebrates once', () => {
    mockUseQuery.mockReturnValue(withSessions(16))
    const { getByText } = render(<CelebrationScreen />, { wrapper: AllTheProviders })
    expect(getByText('You finished GPP')).toBeTruthy()
    expect(mockConfettiRenders).toBeGreaterThan(0)
  })

  it('every session with Reduce Motion on: no confetti', () => {
    mockReduceMotion = true
    mockUseQuery.mockReturnValue(withSessions(16))
    const { getByText } = render(<CelebrationScreen />, { wrapper: AllTheProviders })
    expect(getByText('You finished GPP')).toBeTruthy()
    expect(mockConfettiRenders).toBe(0)
  })

  it('shows the block length and dates', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<CelebrationScreen />, { wrapper: AllTheProviders })
    expect(getByText(/^4 weeks · Oct 19 – /)).toBeTruthy()
  })

  it('goes to the check-in on Start check-in', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<CelebrationScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByText('Start check-in'))
    expect(mockPush).toHaveBeenCalledWith('/(reassessment)/self-assessment')
  })

  it('redirects to Today when no check-in is pending', () => {
    mockUseQuery.mockReturnValue({ ...MOCK_REASSESSMENT_STATUS, reassessmentPending: false })
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

  it('renders 4 difficulty options as radio buttons', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText, getAllByRole } = render(<SelfAssessmentScreen />, {
      wrapper: AllTheProviders,
    })
    expect(getByText('Too easy')).toBeTruthy()
    expect(getByText('Just right')).toBeTruthy()
    expect(getByText('Challenging')).toBeTruthy()
    expect(getByText('Too hard')).toBeTruthy()
    expect(getAllByRole('radio')).toHaveLength(4)
  })

  it('renders energy level options', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<SelfAssessmentScreen />, { wrapper: AllTheProviders })
    expect(getByText('Low')).toBeTruthy()
    expect(getByText('Moderate')).toBeTruthy()
    expect(getByText('High')).toBeTruthy()
  })

  it('has Continue button', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<SelfAssessmentScreen />, { wrapper: AllTheProviders })
    expect(getByText('Continue')).toBeTruthy()
  })

  it('renders the phase name in the header', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<SelfAssessmentScreen />, { wrapper: AllTheProviders })
    expect(getByText('How did GPP go?')).toBeTruthy()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// TEST SUITE 3: Decision screen (Repeat or Move on, no timed redirect)
// ─────────────────────────────────────────────────────────────────────────────

import ResultsScreen from '../(reassessment)/results'

describe('ResultsScreen (decision)', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    mockPush.mockReset()
    mockReplace.mockReset()
    mockUseMutation.mockReset()
    mockUseMutation.mockResolvedValue({})
  })

  it('summarizes the check-in in one card', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    expect(getByText('GPP block')).toBeTruthy()
    expect(getByText('14 of 16 sessions')).toBeTruthy()
    expect(getByText('Just right · moderate energy')).toBeTruthy()
    expect(getByText('No changes')).toBeTruthy()
  })

  it('offers Move on and Repeat, with nothing chosen yet', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText, getByTestId, getAllByRole } = render(<ResultsScreen />, {
      wrapper: AllTheProviders,
    })
    expect(getAllByRole('radio').map((r) => r.props.accessibilityState?.checked)).toEqual([
      false,
      false,
    ])
    expect(getByText('Move on to SPP')).toBeTruthy()
    expect(getByText('Repeat GPP')).toBeTruthy()
    expect(getByText('Choose an option')).toBeTruthy()
    fireEvent.press(getByTestId('decision-confirm'))
    expect(mockUseMutation).not.toHaveBeenCalled()
  })

  it('shows the skill-level raise only with Move on, when eligible', () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByText } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    expect(getByText('Your skill level goes up to Moderate.')).toBeTruthy()
  })

  it('does NOT show a skill-level raise when not eligible', () => {
    mockUseQuery.mockReturnValue({
      ...MOCK_REASSESSMENT_STATUS,
      canUpgradeSkillLevel: false,
      nextSkillLevel: null,
    })
    const { queryByText } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    expect(queryByText(/skill level goes up/)).toBeNull()
  })

  it('Repeat saves the choice and goes straight to Today', async () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByTestId, getByText } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('decision-repeat'))
    expect(getByText('Start GPP again')).toBeTruthy()
    fireEvent.press(getByTestId('decision-confirm'))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(athlete)'))
    expect(mockUseMutation).toHaveBeenCalledWith(
      expect.objectContaining({ decision: 'repeat', phaseDifficulty: 'just_right' })
    )
  })

  it('Move on saves the choice and goes straight to Today', async () => {
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByTestId, getByText } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('decision-move_on'))
    expect(getByText('Start SPP')).toBeTruthy()
    fireEvent.press(getByTestId('decision-confirm'))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(athlete)'))
    expect(mockUseMutation).toHaveBeenCalledWith(expect.objectContaining({ decision: 'move_on' }))
  })

  it('keeps the screen and says so when saving fails', async () => {
    mockUseMutation.mockRejectedValue(new Error('offline'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockUseQuery.mockReturnValue(MOCK_REASSESSMENT_STATUS)
    const { getByTestId, findByText } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('decision-repeat'))
    fireEvent.press(getByTestId('decision-confirm'))
    expect(await findByText(/didn't save/)).toBeTruthy()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
