import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { Wrapper as wrapper } from '../../jest/firstRunTestUtils'

let mockToday: unknown = { _id: 't1', name: 'Lower Body A - Foundation' }
const mockStart = jest.fn(async (_args: unknown) => ({ sessionId: 's1' }))
jest.mock('convex/react', () => ({
  useQuery: () => mockToday,
  useMutation: () => mockStart,
}))
let mockParams: Record<string, string> = {}
const mockReplace = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useLocalSearchParams: () => mockParams,
}))
jest.mock('../../components/AuthGuard', () => ({
  AthleteOnlyRoute: ({ children }: { children: React.ReactNode }) => children,
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// eslint-disable-next-line import/first
import ReadyScreen from '../ready'

async function show() {
  render(<ReadyScreen />, { wrapper })
  await act(async () => {})
}

beforeEach(() => {
  jest.clearAllMocks()
  mockToday = { _id: 't1', name: 'Lower Body A - Foundation' }
  mockParams = {}
})

describe('After saving', () => {
  it('Start Day 1 starts the session and opens the workout on its warm-up', async () => {
    await show()
    expect(screen.getByText("You're set.")).toBeTruthy()
    expect(screen.getByTestId('ready-detail').props.children).toBe(
      'Lower Body A - Foundation is first. It starts with the warm-up.'
    )
    await act(async () => {
      fireEvent.press(screen.getByTestId('ready-start'))
    })
    expect(mockStart).toHaveBeenCalledWith({ templateId: 't1' })
    expect(mockReplace).toHaveBeenCalledWith({ pathname: '/(athlete)/workout/execute/[id]', params: { id: 's1' } })
  })

  it('Not now goes to Today', async () => {
    await show()
    fireEvent.press(screen.getByTestId('ready-not-now'))
    expect(mockReplace).toHaveBeenCalledWith('/(athlete)')
  })

  it('says the existing plan was kept', async () => {
    mockParams = { kept: '1' }
    await show()
    expect(screen.getByTestId('ready-detail').props.children).toMatch(/kept it and its history/)
  })

  it('waits for the workout before Start Day 1 works', async () => {
    mockToday = undefined
    await show()
    await act(async () => {
      fireEvent.press(screen.getByTestId('ready-start'))
    })
    expect(mockStart).not.toHaveBeenCalled()
  })
})
