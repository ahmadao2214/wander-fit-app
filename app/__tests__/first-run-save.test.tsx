import React from 'react'
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
  user: null | { id: string; primaryEmailAddress: { emailAddress: string }; fullName: string; firstName: string }
  signOut: jest.Mock
} = { user: null, signOut: jest.fn(async () => {}) }
// The signed-in user the sheet sees through useUser
let mockSignedIn: null | { primaryEmailAddress: { emailAddress: string } } = null
const mockSignUp = {
  create: jest.fn(async () => ({})),
  prepareEmailAddressVerification: jest.fn(async () => ({})),
  attemptEmailAddressVerification: jest.fn(async () => ({ status: 'complete', createdSessionId: 'sess_1', createdUserId: 'user_1' })),
}
const mockSetActive = jest.fn(async () => {
  mockClerk.user = { id: 'user_1', primaryEmailAddress: { emailAddress: 'a@b.co' }, fullName: 'Sam', firstName: 'Sam' }
})
jest.mock('@clerk/clerk-expo', () => ({
  useSignUp: () => ({ isLoaded: true, signUp: mockSignUp, setActive: mockSetActive }),
  useSSO: () => ({ startSSOFlow: jest.fn() }),
  useUser: () => ({ user: mockSignedIn }),
  useClerk: () => mockClerk,
}))
jest.mock('expo-auth-session', () => ({ makeRedirectUri: () => 'myapp://oauth' }))

const mockCreateUser = jest.fn(async (_args: unknown) => 'u1')
const mockCompleteIntake = jest.fn(async (_args: unknown) => ({ keptExistingProgram: false }))
jest.mock('convex/react', () => ({
  useConvexAuth: () => ({ isAuthenticated: true, isLoading: false }),
  useMutation: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    return name === 'users:createUser' ? mockCreateUser : mockCompleteIntake
  },
}))
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }))

const mockReplace = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: mockReplace, push: mockPush }) }))

// eslint-disable-next-line import/first
import { SavePlanSheet, programWelcomeParams } from '../../components/first-run/SavePlanSheet'

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

async function signUpWithEmail() {
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
  testDraft.reset()
  await testDraft.seed({ answers, lastStep: 'reveal' })
  await testDraft.current.load()
})

describe('Save your plan', () => {
  it('offers email, with no skip and no role question', async () => {
    await show()
    expect(screen.getByTestId('save-plan-email')).toBeTruthy()
    expect(screen.queryByText(/skip/i)).toBeNull()
    expect(screen.queryByText(/not now/i)).toBeNull()
    expect(screen.queryByText(/coach|trainer|role/i)).toBeNull()
    // Apple appears only once it's enabled in Clerk.
    expect(screen.queryByTestId('save-plan-apple')).toBeNull()
  })

  it('email sign-up creates the athlete, saves the program with firstLaunchAt, then clears the draft', async () => {
    await show()
    await signUpWithEmail()

    expect(mockSignUp.create).toHaveBeenCalledWith({ emailAddress: 'a@b.co', password: 'long-enough-1' })
    expect(mockCreateUser).toHaveBeenCalledWith({ clerkId: 'user_1', email: 'a@b.co', name: 'Sam', role: 'client' })
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
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(athlete)/program', params: { welcome: '1', next: 'Tomorrow' } })
    expect(testDraft.current.current()).toBeNull()
    expect((await testDraft.reopen()).answers).toEqual({})
  })

  it('tells the Program tab when an existing program was kept', async () => {
    mockCompleteIntake.mockResolvedValueOnce({ keptExistingProgram: true })
    await show()
    await signUpWithEmail()
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(athlete)/program', params: { welcome: '1', kept: '1' } })
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
    await press('save-plan-email')
    fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.cm')
    fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
    await press('save-plan-create')
    await press('save-plan-change-email')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
    await press('save-plan-create')
    expect(mockSignUp.create).toHaveBeenLastCalledWith(expect.objectContaining({ emailAddress: 'a@b.co' }))
  })

  it('hides Change email while the code is being checked', async () => {
    let finishVerify = () => {}
    mockSignUp.attemptEmailAddressVerification.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishVerify = () => resolve({ status: 'complete', createdSessionId: 'sess_1', createdUserId: 'user_1' })
        })
    )
    await show()
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
    await press('save-plan-email')
    fireEvent.changeText(screen.getByTestId('save-plan-name'), 'Sam')
    fireEvent.changeText(screen.getByTestId('save-plan-email-input'), 'a@b.co')
    fireEvent.changeText(screen.getByTestId('save-plan-password'), 'long-enough-1')
    await press('save-plan-create')
    await press('save-plan-sign-in')
    expect(mockPush).toHaveBeenCalledWith('/(auth)/sign-in')
  })
})

describe('programWelcomeParams', () => {
  it('marks the first visit, with Day 1’s day or the kept-program note', () => {
    expect(programWelcomeParams(false, 'Tomorrow')).toEqual({ welcome: '1', next: 'Tomorrow' })
    expect(programWelcomeParams(false)).toEqual({ welcome: '1' })
    expect(programWelcomeParams(true, 'Tomorrow')).toEqual({ welcome: '1', kept: '1' })
  })
})
