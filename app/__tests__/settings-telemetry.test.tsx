import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import SettingsScreen from '../(athlete)/settings'

const mockNavigate = jest.fn()
const mockUpdatePreferences = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), navigate: mockNavigate }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('convex/react', () => ({
  useQuery: () => ({ ageGroup: '18-35' }),
  useMutation: () => mockUpdatePreferences,
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      _id: 'user_123',
      name: 'Alex',
      email: 'alex@example.com',
      analyticsOptOut: false,
      sessionReplayOptIn: false,
    },
    isLoading: false,
    hasCompletedIntake: true,
  }),
}))

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders App Settings header, Privacy & telemetry section, and routes back explicitly to Profile (S9)', () => {
    const { getByText, getByTestId, getByLabelText } = render(<SettingsScreen />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('App Settings')).toBeTruthy()
    expect(getByText('Privacy & telemetry')).toBeTruthy()
    expect(getByText('Share anonymous usage analytics')).toBeTruthy()
    expect(getByTestId('analytics-opt-in-status').props.children).toBe('On')

    fireEvent.press(getByLabelText('Back'))
    expect(mockNavigate).toHaveBeenCalledWith('/(athlete)/profile')
  })
})
