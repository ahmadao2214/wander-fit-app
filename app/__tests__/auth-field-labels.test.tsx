import React from 'react'
import { act, fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockStartSSOFlow = jest.fn(async (_args: unknown) => ({}))
jest.mock('@clerk/clerk-expo', () => ({
  useSignIn: () => ({ isLoaded: true, signIn: {}, setActive: jest.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: {}, setActive: jest.fn() }),
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: jest.fn() }),
}))

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    users: { createUser: 'users.createUser' },
    invitations: { acceptInvitation: 'invitations.acceptInvitation' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  warmUpAsync: jest.fn(),
  coolDownAsync: jest.fn(),
}))
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: (options?: { scheme?: string; path?: string }) =>
    options?.scheme ? `${options.scheme}://${options.path}` : 'http://localhost:8081/',
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../components/AuthGuard', () => ({
  PublicOnlyRoute: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ needsSetup: false, isLoading: false }),
}))

import SignInScreen from '../(auth)/sign-in'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

function expectLabeledField(screen: ReturnType<typeof render>, testID: string, label: string) {
  // A visible label that stays after typing, and the same name for screen readers
  expect(screen.getByText(label)).toBeTruthy()
  const input = screen.getByTestId(testID)
  expect(input.props.accessibilityLabel).toBe(label)
  expect(input.props.placeholder).toBeUndefined()
}

describe('Auth field labels', () => {
  it('sign-in labels email and password', () => {
    const screen = render(<SignInScreen />, { wrapper: AllTheProviders })
    expectLabeledField(screen, 'sign-in-email', 'Email address')
    expectLabeledField(screen, 'sign-in-password', 'Password')
  })

  it('sign-in offers Apple, Google and email together', () => {
    const screen = render(<SignInScreen />, { wrapper: AllTheProviders })
    expect(screen.getByText('Continue with Apple')).toBeTruthy()
    expect(screen.getByText('Continue with Google')).toBeTruthy()
    expect(screen.getByTestId('sign-in-email')).toBeTruthy()
    expect(screen.getByTestId('sign-in-submit')).toBeTruthy()
  })

  it.each([
    ['sign-in-apple', 'oauth_apple'],
    ['sign-in-google', 'oauth_google'],
  ])('%s starts %s and returns to wanderfit://oauth', async (testID, strategy) => {
    mockStartSSOFlow.mockClear()
    const screen = render(<SignInScreen />, { wrapper: AllTheProviders })
    await act(async () => {
      fireEvent.press(screen.getByTestId(testID))
    })
    expect(mockStartSSOFlow).toHaveBeenCalledWith({ strategy, redirectUrl: 'wanderfit://oauth' })
  })

  it('sign-in shows the Wander Fit wordmark instead of the lightning bolt', () => {
    const screen = render(<SignInScreen />, { wrapper: AllTheProviders })
    expect(screen.getByTestId('sign-in-wordmark').props.accessibilityLabel).toBe('Wander Fit')
  })
})
