import React from 'react'
import { Platform } from 'react-native'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'
import { seasonStartForWeeks } from '../../lib/firstRun'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))

// Clerk: a sign-up that verifies, and a session whose user appears on setActive.
const mockClerk: {
  user: null | {
    id: string
    primaryEmailAddress: { emailAddress: string }
    fullName: string
    firstName: string
  }
  signOut: jest.Mock
} = { user: null, signOut: jest.fn(async () => {}) }
// The signed-in user the sheet sees through useUser
let mockSignedIn: null | { primaryEmailAddress: { emailAddress: string } } = null
const mockSignUp = {
  create: jest.fn(async () => ({})),
  prepareEmailAddressVerification: jest.fn(async () => ({})),
  attemptEmailAddressVerification: jest.fn(async () => ({
    status: 'complete',
    createdSessionId: 'sess_1',
    createdUserId: 'user_1',
  })),
}
const mockSetActive = jest.fn(async () => {
  mockClerk.user = {
    id: 'user_1',
    primaryEmailAddress: { emailAddress: 'a@b.co' },
    fullName: 'Sam',
    firstName: 'Sam',
  }
})
const mockStartSSOFlow = jest.fn(async (_args: unknown) => ({}))
const mockRedirect = jest.fn()
jest.mock('@clerk/clerk-expo', () => ({
  useSignUp: () => ({ isLoaded: true, signUp: mockSignUp, setActive: mockSetActive }),
  useSignIn: () => ({ signIn: { authenticateWithRedirect: mockRedirect } }),
  useSSO: () => ({ startSSOFlow: mockStartSSOFlow }),
  useUser: () => ({ user: mockSignedIn }),
  useClerk: () => mockClerk,
}))
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: (options?: { scheme?: string; path?: string }) =>
    options?.scheme ? `${options.scheme}://${options.path}` : 'http://localhost:8081/',
}))
const mockOpenBrowser = jest.fn(async (_url: string) => ({}))
jest.mock('expo-web-browser', () => ({ openBrowserAsync: (url: string) => mockOpenBrowser(url) }))

const mockCreateUser = jest.fn(async (_args: unknown) => 'u1')
const mockRecordTerms = jest.fn(async (_args: unknown) => null)
const mockCompleteIntake = jest.fn(async (_args: unknown) => ({ keptExistingProgram: false }))
jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    if (name === 'users:createUser') return mockCreateUser
    if (name === 'users:recordTermsAcceptance') return mockRecordTerms
    return mockCompleteIntake
  },
}))
// The Convex users row, when the account already has one.
let mockConvexUser: null | { _id: string } = null
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: mockConvexUser }) }))

const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }))

// eslint-disable-next-line import/first
import { SavePlanSheet, programWelcomeParams } from '../../components/first-run/SavePlanSheet'
// eslint-disable-next-line import/first
import { TERMS_VERSION } from '../../lib/legal'

const answers = {
  sportId: 'basketball',
  seasonStart: seasonStartForWeeks(12, new Date()),
  trainingDays: [1, 3, 5],
  ageGroup: '14-17' as const,
  years: 'new' as const,
}

async function show() {
  render(<SavePlanSheet open onOpenChange={jest.fn()} nextLabel="Tomorrow" />, { wrapper })
  await act(async () => {})
}

const press = (id: string) =>
  act(async () => {
    fireEvent.press(screen.getByTestId(id))
  })

const ADULT_SENTENCE =
  'I agree to the Terms of Service and Privacy Policy, and I acknowledge the Health & Fitness Disclaimer (general strength and conditioning guidance only, not medical advice).'
const YOUTH_SENTENCE =
  "I have my parent or legal guardian's permission to use WanderFit, and together we agree to the Terms of Service, Privacy Policy, and Health & Fitness Disclaimer."

const isChecked = () => screen.getByTestId('save-plan-accept').props.accessibilityState.checked

async function signUpWithEmail() {
  await press('save-plan-accept')
  await press('save-plan-email')
  fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
  fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
  fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
  await press('save-plan-create')
  await act(async () => {
    fireEvent.changeText(screen.getByTestId('save-plan-code'), '424242')
  })
  await act(async () => {})
}

beforeEach(async () => {
  jest.clearAllMocks()
  mockClerk.user = null
  mockSignedIn = null
  mockConvexUser = null
  testDraft.reset()
  await testDraft.seed({ answers, lastStep: 'reveal' })
  await testDraft.current.load()
})

describe('Save your plan', () => {
  it('offers Apple, Google and email, with no skip and no role question', async () => {
    await show()
    expect(screen.getByText('Continue with Apple')).toBeTruthy()
    expect(screen.getByText('Continue with Google')).toBeTruthy()
    expect(screen.getByText('Continue with email')).toBeTruthy()
    expect(screen.queryByText(/skip/i)).toBeNull()
    expect(screen.queryByText(/not now/i)).toBeNull()
    expect(screen.queryByText(/coach|trainer|role/i)).toBeNull()
  })

  it.each([
    ['save-plan-apple', 'oauth_apple'],
    ['save-plan-google', 'oauth_google'],
  ])('%s starts %s and returns to wanderfit://oauth', async (testID, strategy) => {
    await show()
    await press(testID)
    expect(mockStartSSOFlow).toHaveBeenCalledWith({ strategy, redirectUrl: 'wanderfit://oauth' })
    // No session came back, so nothing is saved and the draft stays.
    expect(mockCompleteIntake).not.toHaveBeenCalled()
  })

  it('saves the plan after a new Google account signs up', async () => {
    mockStartSSOFlow.mockResolvedValueOnce({
      createdSessionId: 'sess_g',
      setActive: mockSetActive,
      signUp: { emailAddress: 'g@b.co', firstName: 'Gia', lastName: '' },
    } as never)
    await show()
    await press('save-plan-google')
    expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_g' })
    expect(mockCreateUser).toHaveBeenCalledWith(expect.objectContaining({ name: 'Gia' }))
    expect(mockCompleteIntake).toHaveBeenCalled()
    expect(mockReplace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(athlete)/program' })
    )
  })

  it('says so when Apple sign-in does not finish', async () => {
    mockStartSSOFlow.mockRejectedValueOnce(new Error('cancelled'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await show()
    await press('save-plan-apple')
    expect(screen.getByTestId('save-plan-error').props.children).toMatch(
      /Apple sign-in didn't finish/
    )
  })

  it('activates a native Google session before saving the draft', async () => {
    mockStartSSOFlow.mockResolvedValueOnce({
      createdSessionId: 'sess_google',
      setActive: mockSetActive,
    })
    await show()
    await press('save-plan-google')
    expect(mockStartSSOFlow).toHaveBeenCalledWith({
      strategy: 'oauth_google',
      redirectUrl: 'wanderfit://oauth',
    })
    expect(mockSetActive).toHaveBeenCalledWith({ session: 'sess_google' })
    expect(mockCompleteIntake).toHaveBeenCalledTimes(1)
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(athlete)/program',
      params: { welcome: '1', next: 'Tomorrow' },
    })
  })

  it('preserves the draft when Google is dismissed', async () => {
    mockStartSSOFlow.mockResolvedValueOnce({
      createdSessionId: null,
      authSessionResult: { type: 'cancel' },
    })
    await show()
    await press('save-plan-google')
    expect(mockCompleteIntake).not.toHaveBeenCalled()
    expect(testDraft.current.current()?.answers).toEqual(answers)
  })

  it('resumes the web draft after Google redirects and saves it once', async () => {
    const os = Platform.OS
    const storage = globalThis.sessionStorage
    const entries = new Map<string, string>()
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        setItem: (key: string, v: string) => entries.set(key, v),
        getItem: (key: string) => entries.get(key),
        removeItem: (key: string) => entries.delete(key),
      },
    })
    try {
      Platform.OS = 'web'
      await show()
      await press('save-plan-google')
      expect(JSON.parse(sessionStorage.getItem('wanderfit.firstRunDraft.v1')!)).toEqual(
        testDraft.current.current()
      )
      expect(mockRedirect).toHaveBeenCalledWith({
        strategy: 'oauth_google',
        redirectUrl: '/google-save-callback',
        redirectUrlComplete: '/reveal?saveWith=google',
      })
      expect(mockCompleteIntake).not.toHaveBeenCalled()
      screen.unmount()
      await mockSetActive()
      mockSignedIn = mockClerk.user
      render(
        <SavePlanSheet open onOpenChange={jest.fn()} returningFromGoogle nextLabel="Tomorrow" />,
        { wrapper }
      )
      await act(async () => {})
      expect(mockCompleteIntake).toHaveBeenCalledTimes(1)
      expect(mockReplace).toHaveBeenCalledWith({
        pathname: '/(athlete)/program',
        params: { welcome: '1', next: 'Tomorrow' },
      })
      expect(testDraft.current.current()).toBeNull()
    } finally {
      Platform.OS = os
      Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage })
    }
  })

  it('email sign-up creates the athlete, saves the program with firstLaunchAt, then clears the draft', async () => {
    await show()
    await signUpWithEmail()

    expect(mockSignUp.create).toHaveBeenCalledWith({
      emailAddress: 'a@b.co',
      password: 'long-enough-1',
    })
    expect(mockCreateUser).toHaveBeenCalledWith({
      clerkId: 'user_1',
      email: 'a@b.co',
      name: 'Sam',
      role: 'client',
      termsAcceptance: { termsVersion: TERMS_VERSION, ageGroup: '14-17' },
    })
    expect(mockRecordTerms).not.toHaveBeenCalled()
    expect(mockCompleteIntake).toHaveBeenCalledWith(
      expect.objectContaining({
        sportId: 'basketball',
        yearsOfExperience: 0,
        preferredTrainingDaysPerWeek: 3,
        selectedTrainingDays: [1, 3, 5],
        weeksUntilSeason: 12,
        ageGroup: '14-17',
        firstLaunchAt: 1000,
      })
    )
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(athlete)/program',
      params: { welcome: '1', next: 'Tomorrow' },
    })
    expect(testDraft.current.current()).toBeNull()
    expect((await testDraft.reopen()).answers).toEqual({})
  })

  it('tells the Program tab when an existing program was kept', async () => {
    mockCompleteIntake.mockResolvedValueOnce({ keptExistingProgram: true })
    await show()
    await signUpWithEmail()
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(athlete)/program',
      params: { welcome: '1', kept: '1' },
    })
  })

  it('keeps the draft and says so when saving fails', async () => {
    mockCompleteIntake.mockRejectedValueOnce(new Error('offline'))
    jest.spyOn(console, 'error').mockImplementation(() => {})
    await show()
    await signUpWithEmail()
    expect(screen.getByTestId('save-plan-error').props.children).toMatch(/couldn't save your plan/)
    expect(mockReplace).not.toHaveBeenCalled()
    expect((await testDraft.reopen()).answers.sportId).toBe('basketball')
  })

  it('labels name, email and password, with a show-password control', async () => {
    await show()
    await press('save-plan-accept')
    await press('save-plan-email')
    expect(screen.getByTestId('save-plan-name').props.accessibilityLabel).toBe('First name')
    expect(screen.getByTestId('save-plan-email-input').props.accessibilityLabel).toBe('Email')
    expect(screen.getByTestId('save-plan-password').props.accessibilityLabel).toBe('Password')
    expect(screen.getByTestId('save-plan-password').props.secureTextEntry).toBe(true)
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Show password'))
    })
    expect(screen.getByTestId('save-plan-password').props.secureTextEntry).toBe(false)
  })

  it('shows field errors next to the fields', async () => {
    await show()
    await press('save-plan-accept')
    await press('save-plan-email')
    await press('save-plan-create')
    expect(screen.getByText('Enter your first name.')).toBeTruthy()
    expect(screen.getByText('Enter your email.')).toBeTruthy()
    expect(mockSignUp.create).not.toHaveBeenCalled()
  })

  it('lets a signed-in athlete switch to a different account', async () => {
    mockSignedIn = { primaryEmailAddress: { emailAddress: 'wrong@b.co' } }
    await show()
    expect(screen.getByText('Signed in as wrong@b.co')).toBeTruthy()
    await press('save-plan-switch-account')
    expect(mockClerk.signOut).toHaveBeenCalled()
    expect(mockCompleteIntake).not.toHaveBeenCalled()
  })

  it('goes back to fix a mistyped email after the code is sent', async () => {
    await testDraft.seed({ answers, lastStep: 'reveal' })
    await show()
    await press('save-plan-accept')
    await press('save-plan-email')
    fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.cm')
    fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
    await press('save-plan-create')
    await press('save-plan-change-email')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
    await press('save-plan-create')
    expect(mockSignUp.create).toHaveBeenLastCalledWith(
      expect.objectContaining({ emailAddress: 'a@b.co' })
    )
  })

  it('hides Change email while the code is being checked', async () => {
    let finishVerify = () => {}
    mockSignUp.attemptEmailAddressVerification.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishVerify = () =>
            resolve({ status: 'complete', createdSessionId: 'sess_1', createdUserId: 'user_1' })
        })
    )
    await show()
    await press('save-plan-accept')
    await press('save-plan-email')
    fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
    fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
    await press('save-plan-create')
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('save-plan-code'), '424242')
    })
    expect(screen.queryByTestId('save-plan-change-email')).toBeNull()
    await act(async () => finishVerify())
  })

  it('offers sign-in when the email already has an account', async () => {
    mockSignUp.create.mockRejectedValueOnce({ errors: [{ code: 'form_identifier_exists' }] })
    await show()
    await press('save-plan-accept')
    await press('save-plan-email')
    fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
    fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
    await press('save-plan-create')
    await press('save-plan-sign-in')
    expect(mockPush).toHaveBeenCalledWith('/(auth)/sign-in')
  })
})

describe('Save your plan, acceptance', () => {
  it('starts unticked, and keeps Continue with email off until the athlete ticks it', async () => {
    await show()
    expect(isChecked()).toBe(false)
    expect(screen.getByTestId('save-plan-email').props['aria-disabled']).toBe(true)
    await press('save-plan-email')
    expect(screen.queryByTestId('save-plan-name')).toBeNull()
    await press('save-plan-accept')
    expect(isChecked()).toBe(true)
    await press('save-plan-email')
    expect(screen.getByTestId('save-plan-create')).toBeTruthy()
  })

  it('asks 14-17 athletes to confirm a parent or legal guardian’s permission', async () => {
    await show()
    expect(screen.getByTestId('save-plan-accept').props.accessibilityLabel).toBe(YOUTH_SENTENCE)
  })

  it('asks athletes 18 and over to agree and acknowledge the disclaimer', async () => {
    await testDraft.current.save({ answers: { ageGroup: '18-35' } })
    await show()
    expect(screen.getByTestId('save-plan-accept').props.accessibilityLabel).toBe(ADULT_SENTENCE)
    await press('save-plan-accept')
    await press('save-plan-email')
    fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
    fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
    await press('save-plan-create')
    await act(async () => {
      fireEvent.changeText(screen.getByTestId('save-plan-code'), '424242')
    })
    await act(async () => {})
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        termsAcceptance: { termsVersion: TERMS_VERSION, ageGroup: '18-35' },
      })
    )
  })

  it('opens Terms and Privacy in the browser without ticking the box', async () => {
    await show()
    await press('save-plan-link-terms')
    await press('save-plan-link-privacy')
    expect(mockOpenBrowser.mock.calls).toEqual([
      ['https://wanderfit.app/terms'],
      ['https://wanderfit.app/privacy'],
    ])
    expect(isChecked()).toBe(false)
  })

  it('shows the Health & Fitness Disclaimer in the sheet, then goes back', async () => {
    await show()
    await press('save-plan-accept')
    await press('save-plan-link-disclaimer')
    expect(screen.getByTestId('save-plan-disclaimer')).toBeTruthy()
    expect(
      screen.getByText(/not medical advice, diagnosis, treatment, or physical therapy/)
    ).toBeTruthy()
    expect(screen.queryByTestId('save-plan-email')).toBeNull()
    await press('save-plan-disclaimer-back')
    expect(screen.queryByTestId('save-plan-disclaimer')).toBeNull()
    expect(isChecked()).toBe(true)
  })

  it('keeps Save to this account off until ticked, then records the acceptance on the existing account', async () => {
    mockSignedIn = { primaryEmailAddress: { emailAddress: 'a@b.co' } }
    mockClerk.user = {
      id: 'user_1',
      primaryEmailAddress: { emailAddress: 'a@b.co' },
      fullName: 'Sam',
      firstName: 'Sam',
    }
    mockConvexUser = { _id: 'u1' }
    await show()
    await press('save-plan-signed-in')
    expect(mockCompleteIntake).not.toHaveBeenCalled()
    await press('save-plan-accept')
    await press('save-plan-signed-in')
    await act(async () => {})
    expect(mockCreateUser).not.toHaveBeenCalled()
    expect(mockRecordTerms).toHaveBeenCalledWith({
      termsAcceptance: { termsVersion: TERMS_VERSION, ageGroup: '14-17' },
    })
    expect(mockCompleteIntake).toHaveBeenCalled()
  })
})

describe('programWelcomeParams', () => {
  it('marks the first visit, with Day 1’s day or the kept-program note', () => {
    expect(programWelcomeParams(false, 'Tomorrow')).toEqual({ welcome: '1', next: 'Tomorrow' })
    expect(programWelcomeParams(false)).toEqual({ welcome: '1' })
    expect(programWelcomeParams(true, 'Tomorrow')).toEqual({ welcome: '1', kept: '1' })
  })
})
