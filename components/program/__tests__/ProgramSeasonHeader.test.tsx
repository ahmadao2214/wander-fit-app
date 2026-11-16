import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'

const STATE = { phase: 'GPP', week: 1, day: 1, weeksPerPhase: 4, sportName: 'Basketball' }
const NEXT = { _id: 'tpl1', name: 'Lower Body A - Foundation', day: 1, estimatedDurationMinutes: 28 }
let mockNext: unknown = NEXT
jest.mock('convex/react', () => ({
  useQuery: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    if (name === 'userPrograms:getCurrentProgramState') return STATE
    if (name === 'scheduleOverrides:getTodayWorkout') return mockNext
    return undefined
  },
}))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('react-native-reanimated', () => jest.requireActual('../../../jest/reanimatedMock'))
jest.mock('../../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

// eslint-disable-next-line import/first
import { ProgramSeasonHeader, seasonPosition, upNextLabel } from '../ProgramSeasonHeader'

const wrapper = ({ children }: { children: React.ReactNode }) => <TamaguiProvider config={config}>{children}</TamaguiProvider>

beforeEach(() => {
  mockNext = NEXT
  mockPush.mockClear()
})

describe('ProgramSeasonHeader', () => {
  it('shows the season as the reveal’s phases, with weeks, and today marked', () => {
    render(<ProgramSeasonHeader welcome={false} kept={false} />, { wrapper })
    expect(screen.getByText('Build the base')).toBeTruthy()
    expect(screen.getByText('GPP · Wk 1–4')).toBeTruthy()
    expect(screen.getByText('SSP · Wk 9–12')).toBeTruthy()
    expect(screen.getByTestId('program-you-are-here')).toBeTruthy()
  })

  it('offers Day 1 as Up next with its day, and opens it only on a tap', () => {
    render(<ProgramSeasonHeader welcome kept={false} next="Tomorrow" />, { wrapper })
    expect(screen.getByText('Up next · Tomorrow')).toBeTruthy()
    expect(screen.getByText('Lower Body A')).toBeTruthy()
    expect(mockPush).not.toHaveBeenCalled()
    fireEvent.press(screen.getByTestId('program-up-next'))
    expect(mockPush).toHaveBeenCalledWith('/(athlete)/workout/tpl1')
  })

  it('says when an existing plan was kept', () => {
    render(<ProgramSeasonHeader welcome kept />, { wrapper })
    expect(screen.getByTestId('program-kept')).toBeTruthy()
  })

  it('leaves out the card when nothing is up next', () => {
    mockNext = null
    render(<ProgramSeasonHeader welcome={false} kept={false} />, { wrapper })
    expect(screen.queryByTestId('program-up-next')).toBeNull()
  })
})

describe('seasonPosition', () => {
  it('marks the middle of the current week along the whole season', () => {
    expect(seasonPosition('GPP', 1, 4)).toBeCloseTo(0.5 / 12)
    expect(seasonPosition('SPP', 1, 4)).toBeCloseTo(4.5 / 12)
    expect(seasonPosition('SSP', 4, 4)).toBeCloseTo(11.5 / 12)
  })
})

describe('upNextLabel', () => {
  it('adds the day when it is known', () => {
    expect(upNextLabel('Tomorrow')).toBe('Up next · Tomorrow')
    expect(upNextLabel()).toBe('Up next')
  })
})
