import React from 'react'
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import { ConvexError } from 'convex/values'
import config from '../../tamagui.config'

const mockReplace = jest.fn()
const mockNavigate = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

const mockDeleteMyAccount = jest.fn()
jest.mock('convex/react', () => ({
  useQuery: () => ({ ageGroup: '18-35' }),
  useMutation: () => jest.fn(),
  useAction: () => mockDeleteMyAccount,
}))

const mockSignOut = jest.fn()
jest.mock('@clerk/clerk-expo', () => ({
  useClerk: () => ({ signOut: mockSignOut }),
}))

const mockOpenBrowser = jest.fn()
jest.mock('expo-web-browser', () => ({
  openBrowserAsync: (url: string) => mockOpenBrowser(url),
}))

const mockClearDraft = jest.fn()
jest.mock('../../lib/firstRunStorage', () => ({
  firstRunDraft: { clear: () => mockClearDraft() },
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

import AthleteSettingsScreen from '../(athlete)/settings'
import { LEGAL_URLS } from '../../lib/legal'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

// Sheet mount + Tamagui animations are slow on a cold CI runner.
jest.setTimeout(20000)

async function renderScreen() {
  const screen = render(<AthleteSettingsScreen />, { wrapper })
  await act(async () => {})
  return screen
}

async function openConfirmStep(screen: Awaited<ReturnType<typeof renderScreen>>) {
  await act(async () => {
    fireEvent.press(screen.getByTestId('settings-delete-account'))
  })
  await act(async () => {
    fireEvent.press(screen.getByTestId('delete-account-continue'))
  })
}

describe('App Settings: Support & Legal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOpenBrowser.mockResolvedValue({ type: 'opened' })
  })

  it.each([
    ['settings-support', LEGAL_URLS.support],
    ['settings-privacy', LEGAL_URLS.privacy],
    ['settings-terms', LEGAL_URLS.terms],
  ])('%s opens %s in the browser', async (testID, url) => {
    const screen = await renderScreen()
    await act(async () => {
      fireEvent.press(screen.getByTestId(testID))
    })
    expect(mockOpenBrowser).toHaveBeenCalledWith(url)
  })

  it('labels each link and says it opens in the browser', async () => {
    const { getByLabelText } = await renderScreen()
    expect(getByLabelText('Help & Support, opens in browser')).toBeTruthy()
    expect(getByLabelText('Privacy Policy, opens in browser')).toBeTruthy()
    expect(getByLabelText('Terms of Service, opens in browser')).toBeTruthy()
  })

  it('opens the full Health & Fitness Disclaimer in the app', async () => {
    const screen = await renderScreen()
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-disclaimer'))
    })
    expect(screen.getByText(/Not Medical Advice or Physical Therapy/)).toBeTruthy()
    expect(screen.getByText(/Stop Immediately If You Feel Pain/)).toBeTruthy()
    expect(mockOpenBrowser).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.press(screen.getByTestId('health-disclaimer-terms'))
    })
    expect(mockOpenBrowser).toHaveBeenCalledWith(LEGAL_URLS.terms)
  })
})

describe('App Settings: Delete account', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDeleteMyAccount.mockResolvedValue({ deleted: true })
    mockSignOut.mockResolvedValue(undefined)
    mockClearDraft.mockResolvedValue(undefined)
  })

  it('first explains what is lost and the store subscription, without deleting', async () => {
    const screen = await renderScreen()
    await act(async () => {
      fireEvent.press(screen.getByTestId('settings-delete-account'))
    })
    const step = within(screen.getByTestId('delete-account-step-explain'))
    expect(step.getByText(/Your program/)).toBeTruthy()
    expect(step.getByText(/workout history/)).toBeTruthy()
    expect(step.getByText(/1RM maxes/)).toBeTruthy()
    expect(step.getByText(/App Store or Google Play/)).toBeTruthy()
    expect(step.getByText(/device settings/)).toBeTruthy()
    expect(screen.queryByTestId('delete-account-confirm-input')).toBeNull()
    expect(mockDeleteMyAccount).not.toHaveBeenCalled()
  })

  it('keeps delete disabled until DELETE is typed', async () => {
    const screen = await renderScreen()
    await openConfirmStep(screen)

    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-submit'))
    })
    expect(mockDeleteMyAccount).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'delete me')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-submit'))
    })
    expect(mockDeleteMyAccount).not.toHaveBeenCalled()
  })

  it('deletes, clears the First Run draft, signs out and opens the First Run', async () => {
    const order: string[] = []
    mockDeleteMyAccount.mockImplementation(async () => {
      order.push('delete')
      return { deleted: true }
    })
    mockClearDraft.mockImplementation(async () => {
      order.push('clearDraft')
    })
    mockSignOut.mockImplementation(async () => {
      order.push('signOut')
    })
    mockReplace.mockImplementation(() => order.push('route'))

    const screen = await renderScreen()
    await openConfirmStep(screen)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'DELETE')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-submit'))
    })

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(first-run)'))
    expect(mockDeleteMyAccount).toHaveBeenCalledWith({})
    expect(order).toEqual(['delete', 'clearDraft', 'signOut', 'route'])
  })

  it('still routes to the First Run when sign-out throws after the account is gone', async () => {
    mockSignOut.mockRejectedValue(new Error('session not found'))
    jest.spyOn(console, 'warn').mockImplementation(() => {})

    const screen = await renderScreen()
    await openConfirmStep(screen)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'DELETE')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-submit'))
    })

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(first-run)'))
  })

  it('stays signed in and says so when deletion fails', async () => {
    mockDeleteMyAccount.mockRejectedValue(new Error('network'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const screen = await renderScreen()
    await openConfirmStep(screen)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'DELETE')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-submit'))
    })

    expect(screen.getByTestId('delete-account-error')).toBeTruthy()
    expect(screen.getByText(/was not deleted/)).toBeTruthy()
    expect(mockSignOut).not.toHaveBeenCalled()
    expect(mockClearDraft).not.toHaveBeenCalled()
    expect(mockReplace).not.toHaveBeenCalled()
  })

  it('tells an account with legacy trainer data to contact support', async () => {
    mockDeleteMyAccount.mockRejectedValue(new ConvexError('trainer_data'))
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const screen = await renderScreen()
    await openConfirmStep(screen)
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('delete-account-confirm-input'), 'DELETE')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-submit'))
    })

    expect(screen.getByText(/Contact Wander Fit support/)).toBeTruthy()
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('Back on the confirm step returns to the explanation', async () => {
    const screen = await renderScreen()
    await openConfirmStep(screen)
    await act(async () => {
      fireEvent.press(screen.getByTestId('delete-account-back'))
    })
    expect(screen.getByTestId('delete-account-step-explain')).toBeTruthy()
  })
})
