import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import CommitmentScreen from '../(onboarding)/commitment'

const mockUseQuery = jest.fn()
const mockCompleteIntake = jest.fn()
const mockCompleteOnboarding = jest.fn()
const mockReplace = jest.fn()
const mockBack = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (name: string) => mockUseQuery(name),
  useMutation: (name: string) =>
    name === 'completeIntake' ? mockCompleteIntake : mockCompleteOnboarding,
}))

jest.mock('convex/_generated/api', () => ({
  api: {
    onboarding: {
      getOnboardingState: 'getOnboardingState',
      getOnboardingData: 'getOnboardingData',
      completeOnboarding: 'completeOnboarding',
    },
    userPrograms: {
      getCurrentUserProgram: 'getCurrentUserProgram',
      completeIntake: 'completeIntake',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, back: mockBack }),
  useLocalSearchParams: () => ({
    sportId: 'sport-1',
    ageGroup: '18-35',
    yearsOfExperience: '0',
    trainingDays: '3',
    selectedTrainingDays: '1,3,5',
    weeksUntilSeason: '12',
  }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../lib/analytics', () => ({
  analytics: new Proxy({}, { get: () => jest.fn() }),
}))

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

function queries(existingProgram: unknown = null) {
  mockUseQuery.mockImplementation((name: string) => {
    if (name === 'getOnboardingState') return { isRevisit: false }
    if (name === 'getOnboardingData') return { userName: 'Verify Athlete', sport: { name: 'Basketball' } }
    if (name === 'getCurrentUserProgram') return existingProgram
    return undefined
  })
}

describe('CommitmentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCompleteIntake.mockResolvedValue({})
    mockCompleteOnboarding.mockResolvedValue(null)
  })

  it('shows a tap button instead of a hold', () => {
    queries()
    const { getByTestId, getByText, queryByText } = render(<CommitmentScreen />, { wrapper: AllTheProviders })
    expect(getByTestId('commitment-button')).toBeTruthy()
    expect(getByText('I Commit')).toBeTruthy()
    expect(queryByText(/Hold for/)).toBeNull()
  })

  it('creates the program and goes straight to Today on one tap', async () => {
    queries()
    const { getByTestId } = render(<CommitmentScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('commitment-button'))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(athlete)'))
    expect(mockCompleteIntake).toHaveBeenCalledWith({
      sportId: 'sport-1',
      yearsOfExperience: 0,
      preferredTrainingDaysPerWeek: 3,
      selectedTrainingDays: [1, 3, 5],
      weeksUntilSeason: 12,
      ageGroup: '18-35',
    })
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1)
  })

  it("shows You're Committed! while the program is being created", async () => {
    queries()
    let finish: (value: unknown) => void = () => {}
    mockCompleteIntake.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    const { getByTestId, findByText, queryByTestId } = render(<CommitmentScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('commitment-button'))
    expect(await findByText("You're Committed!")).toBeTruthy()
    expect(queryByTestId('commitment-button')).toBeNull()
    finish({})
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(athlete)'))
  })

  it('skips completeIntake when a program already exists', async () => {
    queries({ _id: 'program-1' })
    const { getByTestId } = render(<CommitmentScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('commitment-button'))
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(athlete)'))
    expect(mockCompleteIntake).not.toHaveBeenCalled()
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1)
  })

  it('brings the button back when the save fails', async () => {
    queries()
    const alertSpy = jest.fn()
    ;(global as unknown as { alert: jest.Mock }).alert = alertSpy
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockCompleteIntake.mockRejectedValue(new Error('Invalid sport'))
    const { getByTestId, findByTestId } = render(<CommitmentScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByTestId('commitment-button'))
    expect(await findByTestId('commitment-button')).toBeTruthy()
    expect(alertSpy).toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })
})
