import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'

import config from '../../tamagui.config'
import SettingsScreen from '../(athlete)/settings'

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockUseQuery = jest.fn()
const mockSetEquipmentMode = jest.fn()
const mockBack = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
  useMutation: () => mockSetEquipmentMode,
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getEquipmentMode: 'userPrograms.getEquipmentMode',
      setEquipmentMode: 'userPrograms.setEquipmentMode',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
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

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const isSelected = (label: string) =>
  screen.getByLabelText(label).props.accessibilityState?.selected

beforeEach(() => {
  jest.clearAllMocks()
  mockSetEquipmentMode.mockResolvedValue(null)
})

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Settings screen', () => {
  it('shows a loading state while the preference loads', () => {
    mockUseQuery.mockReturnValue(undefined)

    render(<SettingsScreen />, { wrapper: AllTheProviders })

    expect(screen.getByText('Loading...')).toBeTruthy()
  })

  it('queries the persisted equipment mode', () => {
    mockUseQuery.mockReturnValue('gym')

    render(<SettingsScreen />, { wrapper: AllTheProviders })

    expect(mockUseQuery).toHaveBeenCalledWith('userPrograms.getEquipmentMode', {})
  })

  it.each(['gym', 'home'] as const)('reflects a persisted %s preference', (mode) => {
    mockUseQuery.mockReturnValue(mode)

    render(<SettingsScreen />, { wrapper: AllTheProviders })

    expect(isSelected('Gym mode')).toBe(mode === 'gym')
    expect(isSelected('Home mode')).toBe(mode === 'home')
  })

  it('defaults to gym when no preference is stored', () => {
    mockUseQuery.mockReturnValue(null)

    render(<SettingsScreen />, { wrapper: AllTheProviders })

    expect(isSelected('Gym mode')).toBe(true)
  })

  it('saves the new mode when toggled', async () => {
    mockUseQuery.mockReturnValue('gym')

    render(<SettingsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(screen.getByLabelText('Home mode'))

    await waitFor(() =>
      expect(mockSetEquipmentMode).toHaveBeenCalledWith({ equipmentMode: 'home' })
    )
  })

  it('does not save when the current mode is pressed again', () => {
    mockUseQuery.mockReturnValue('gym')

    render(<SettingsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(screen.getByLabelText('Gym mode'))

    expect(mockSetEquipmentMode).not.toHaveBeenCalled()
  })

  it('shows an error and keeps the saved mode when the save fails', async () => {
    mockUseQuery.mockReturnValue('gym')
    mockSetEquipmentMode.mockRejectedValue(new Error('No active program found'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<SettingsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(screen.getByLabelText('Home mode'))

    expect(
      await screen.findByText('Could not save your equipment preference. Please try again.')
    ).toBeTruthy()
    expect(isSelected('Gym mode')).toBe(true)
  })

  it('goes back from the header', () => {
    mockUseQuery.mockReturnValue('gym')

    render(<SettingsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(screen.getByLabelText('Go back'))

    expect(mockBack).toHaveBeenCalled()
  })
})
