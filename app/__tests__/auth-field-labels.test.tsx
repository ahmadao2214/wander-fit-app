import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

jest.mock('@clerk/clerk-expo', () => ({
  useSignIn: () => ({ isLoaded: true, signIn: {}, setActive: jest.fn() }),
  useSignUp: () => ({ isLoaded: true, signUp: {}, setActive: jest.fn() }),
  useSSO: () => ({ startSSOFlow: jest.fn() }),
  useUser: () => ({ user: null }),
  useClerk: () => ({ signOut: jest.fn() }),
}))

jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: false, isLoading: false }),
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: { users: { createUser: 'users.createUser' }, invitations: { acceptInvitation: 'invitations.acceptInvitation' } },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  Link: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), warmUpAsync: jest.fn(), coolDownAsync: jest.fn() }))
jest.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'myapp://' }))

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

})
