import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'
import { revealProgram, seasonStartForWeeks, type CompleteFirstRunAnswers } from '../../lib/firstRun'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))

const DAY_ONE = {
  _id: 't1',
  name: 'Lower Body A - Foundation',
  estimatedDurationMinutes: 28,
  exercises: [
    { section: 'warmup', exercise: { name: "World's Greatest Stretch" } },
    { section: 'main', exercise: { name: 'Goblet Squat' } },
    { section: 'main', exercise: { name: 'Romanian Deadlift' } },
  ],
}
const mockWorkoutArgs: unknown[] = []
let mockWorkout: unknown = DAY_ONE
jest.mock('convex/react', () => ({
  useQuery: (fn: unknown, args: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    const utils = jest.requireActual('../../jest/firstRunTestUtils')
    if (name === 'sports:list') return utils.SPORTS
    if (name === 'sports:getCategories') return utils.CATEGORIES
    if (name === 'programTemplates:getWorkout') {
      if (args === 'skip') return undefined
      mockWorkoutArgs.push(args)
      return mockWorkout
    }
    return undefined
  },
}))

let mockReduced: boolean | null = true
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }))

const mockEntering: unknown[] = []
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native')
  return {
    __esModule: true,
    default: {
      View: ({ entering, children }: { entering?: unknown; children: React.ReactNode }) => {
        mockEntering.push(entering)
        return <View>{children}</View>
      },
    },
    FadeInUp: { delay: () => ({ duration: () => 'fade' }) },
  }
})
jest.mock('../../components/sport-icon/SportIcon', () => ({
  SportIcon: ({ mode }: { mode: string }) => {
    const { View } = jest.requireActual('react-native')
    return <View testID={`sport-icon-${mode}`} />
  },
}))
jest.mock('../../components/first-run/SavePlanSheet', () => ({
  SavePlanSheet: ({ open }: { open: boolean }) => {
    const { Text } = jest.requireActual('react-native')
    return open ? <Text testID="sheet-open">open</Text> : null
  },
}))
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
  Redirect: ({ href }: { href: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text testID="redirect">{href}</Text>
  },
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// eslint-disable-next-line import/first
import FirstRunReveal from '../(first-run)/reveal'

const answers: CompleteFirstRunAnswers = {
  sportId: 'basketball',
  seasonStart: seasonStartForWeeks(15, new Date()),
  trainingDays: [1, 3, 5],
  ageGroup: '14-17',
  years: 'new',
}

async function show() {
  render(<FirstRunReveal />, { wrapper })
  await act(async () => {})
}

beforeEach(async () => {
  testDraft.reset()
  mockReduced = true
  mockWorkout = DAY_ONE
  mockWorkoutArgs.length = 0
  mockEntering.length = 0
  await testDraft.seed({ answers, lastStep: 'about' })
})

describe('First Run reveal', () => {
  it("shows the athlete's real Day 1 for GPP week 1 day 1 at their level", async () => {
    await show()
    expect(screen.getByTestId('day-one-name').props.children).toBe('Lower Body A - Foundation')
    expect(screen.getByText('About 28 min')).toBeTruthy()
    expect(screen.getByText('Goblet Squat')).toBeTruthy()
    expect(screen.queryByText("World's Greatest Stretch")).toBeNull()
    expect(mockWorkoutArgs[mockWorkoutArgs.length - 1]).toEqual({
      gppCategoryId: 2,
      phase: 'GPP',
      skillLevel: 'Novice',
      week: 1,
      day: 1,
    })
  })

  it('shows the same phase weeks and session count the saved program will have', async () => {
    await show()
    const program = revealProgram(answers, new Date())
    expect(screen.getByTestId('reveal-sessions').props.children.join('')).toBe(
      `${program.sessionCount} sessions over ${program.programWeeks} weeks`
    )
    expect(screen.getByTestId('phase-GPP').props.accessibilityLabel).toContain(`${program.weeksPerPhase} weeks`)
    expect(screen.getByTestId('reveal-category').props.children.join('')).toBe('Basketball trains for Power.')
  })

  it('names each phase as text, and tapping one shows its full name', async () => {
    await show()
    expect(screen.getByTestId('phase-name').props.children.join('')).toBe('GPP: General Physical Preparedness')
    fireEvent.press(screen.getByTestId('phase-SSP'))
    expect(screen.getByTestId('phase-name').props.children.join('')).toBe('SSP: Sport-Specific Preparedness')
  })

  it('renders with no animation when Reduce Motion is on', async () => {
    await show()
    expect(mockEntering.length).toBeGreaterThan(0)
    expect(mockEntering.every((e) => e === undefined)).toBe(true)
  })

  it('animates the one moment when Reduce Motion is off', async () => {
    mockReduced = false
    await show()
    expect(screen.getByTestId('sport-icon-once')).toBeTruthy()
    expect(mockEntering).toContain('fade')
  })

  it('waits while Reduce Motion is unknown, so nothing starts and stops', async () => {
    mockReduced = null
    await show()
    expect(screen.getByTestId('reveal-loading')).toBeTruthy()
  })

  it('shows a loading state while the template loads', async () => {
    mockWorkout = undefined
    await show()
    expect(screen.getByTestId('reveal-loading')).toBeTruthy()
    expect(screen.getByTestId('first-run-save')).toBeDisabled()
  })

  it('Save my plan opens the account sheet', async () => {
    await show()
    expect(screen.queryByTestId('sheet-open')).toBeNull()
    fireEvent.press(screen.getByTestId('first-run-save'))
    expect(screen.getByTestId('sheet-open')).toBeTruthy()
  })

  it('sends an incomplete draft back to the first unanswered step', async () => {
    testDraft.reset()
    await testDraft.seed({ answers: { sportId: 'basketball' } })
    await show()
    expect(screen.getByTestId('redirect').props.children).toBe('/(first-run)/season')
  })
})
