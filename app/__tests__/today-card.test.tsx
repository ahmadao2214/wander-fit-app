import React from 'react'
import { act, render } from '@testing-library/react-native'
import { AppState } from 'react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// A two-week phase: the athlete is in week 2, which looks up template week 4
const programState = {
  phase: 'GPP',
  week: 2,
  day: 1,
  weeksPerPhase: 2,
  sportName: 'Basketball',
  categoryShortName: 'Power',
}
const todayWorkout = {
  _id: 'template_1',
  name: 'Upper Push/Pull',
  phase: 'GPP',
  week: 4,
  day: 1,
  estimatedDurationMinutes: 35,
  exercises: [{ section: 'main' }, { section: 'main' }],
}

let mockCurrentSession: any = null
const mockAbandon = jest.fn().mockResolvedValue({ success: true })
const mockPush = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (name: string) =>
    ({
      getCurrentProgramState: programState,
      getProgressSummary: { daysCompleted: 0, currentStreak: 0 },
      getTodayWorkout: todayWorkout,
      getReassessmentStatus: null,
      getCurrentSession: mockCurrentSession,
      getSessionForTemplate: null,
    })[name],
  useMutation: (name: string) => (name === 'abandonSession' ? mockAbandon : jest.fn()),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'getCurrentProgramState',
      getProgressSummary: 'getProgressSummary',
      getReassessmentStatus: 'getReassessmentStatus',
    },
    scheduleOverrides: { getTodayWorkout: 'getTodayWorkout' },
    gppWorkoutSessions: {
      getCurrentSession: 'getCurrentSession',
      getSessionForTemplate: 'getSessionForTemplate',
      startSession: 'startSession',
      abandonSession: 'abandonSession',
    },
  },
}))

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'user_1', name: 'Test Athlete' }, isLoading: false }),
}))
jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))

import { fireEvent } from '@testing-library/react-native'
import AthleteDashboard from '../(athlete)/index'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Today card', () => {
  it("shows the athlete's scheduled week, not the template's lookup week", () => {
    const { getByTestId, getByText, queryByText } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
    expect(getByTestId('today-workout-meta')).toBeTruthy()
    expect(getByText('GPP W2 D1')).toBeTruthy()
    expect(queryByText(/W4/)).toBeNull()
  })

  describe('date heading', () => {
    afterEach(() => {
      jest.useRealTimers()
      jest.restoreAllMocks()
    })

    it('rolls over to the new day at midnight', () => {
      jest.useFakeTimers({ now: new Date(2026, 10, 14, 23, 59, 50) })
      const { getByText } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
      expect(getByText('Saturday, Nov 14')).toBeTruthy()
      act(() => {
        jest.advanceTimersByTime(12_000)
      })
      expect(getByText('Sunday, Nov 15')).toBeTruthy()
    })

    it('re-reads the date when the app comes back to the foreground', () => {
      let onChange: (state: string) => void = () => {}
      jest.spyOn(AppState, 'addEventListener').mockImplementation(((_type: string, handler: (state: string) => void) => {
        onChange = handler
        return { remove: jest.fn() }
      }) as any)
      jest.useFakeTimers({ now: new Date(2026, 10, 14, 9, 0, 0) })
      const { getByText } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
      expect(getByText('Saturday, Nov 14')).toBeTruthy()
      // Backgrounded overnight: the clock jumps without timers firing
      jest.setSystemTime(new Date(2026, 10, 16, 8, 0, 0))
      act(() => onChange('active'))
      expect(getByText('Monday, Nov 16')).toBeTruthy()
    })
  })

  describe('paused workout', () => {
    const paused = (templateId: string, name: string) => ({
      _id: 'session_1',
      templateId,
      status: 'in_progress',
      startedAt: new Date(2026, 10, 13, 9, 0, 0).getTime(),
      pausedAt: new Date(2026, 10, 13, 9, 20, 0).getTime(),
      templateSnapshot: { name },
      template: { name },
    })

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date(2026, 10, 14, 9, 0, 0) })
      jest.clearAllMocks()
    })
    afterEach(() => {
      mockCurrentSession = null
      jest.useRealTimers()
    })

    it("offers Resume for today's workout after the athlete exits it", () => {
      mockCurrentSession = paused('template_1', 'Upper Push/Pull')
      const { getByText, queryByText } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
      fireEvent.press(getByText('Resume Workout'))
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/(athlete)/workout/execute/[id]',
        params: { id: 'session_1' },
      })
      expect(queryByText('Start Workout')).toBeNull()
    })

    it('brings back a workout paused on an earlier day instead of starting a new one', () => {
      mockCurrentSession = paused('template_0', 'Lower Body Foundation')
      const { getByText, queryByText } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
      expect(getByText('Lower Body Foundation')).toBeTruthy()
      expect(getByText(/Paused yesterday/)).toBeTruthy()
      expect(getByText('Resume Workout')).toBeTruthy()
      expect(queryByText('Start Workout')).toBeNull()
    })

    it('discards only after the athlete confirms', async () => {
      mockCurrentSession = paused('template_0', 'Lower Body Foundation')
      const { getByTestId, findByTestId } = render(<AthleteDashboard />, { wrapper: AllTheProviders })
      fireEvent.press(getByTestId('today-discard'))
      expect(mockAbandon).not.toHaveBeenCalled()
      const confirm = await findByTestId('today-discard-confirm')
      await act(async () => {
        fireEvent.press(confirm)
      })
      expect(mockAbandon).toHaveBeenCalledWith({ sessionId: 'session_1' })
    })
  })
})
