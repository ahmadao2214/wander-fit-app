import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockSetParams = jest.fn()
let mockParams: Record<string, string> = {}
let mockBlur: (() => void) | undefined
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), setParams: mockSetParams }),
  useLocalSearchParams: () => mockParams,
  // Runs the focus callback now and keeps its cleanup, which runs on blur.
  useFocusEffect: (cb: () => (() => void) | void) => {
    jest.requireActual('react').useEffect(() => {
      mockBlur = cb() || undefined
    }, [cb])
  },
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { _id: 'u1' }, isLoading: false }),
}))
jest.mock('../../components/calendar', () => ({ WorkoutCalendar: () => null }))
jest.mock('../../components/program/ProgramSeasonHeader', () => ({
  ProgramSeasonHeader: ({ welcome, next }: { welcome: boolean; next?: string }) => {
    const { Text } = jest.requireActual('react-native')
    return <Text testID="header">{`${welcome}|${next ?? ''}`}</Text>
  },
}))

// eslint-disable-next-line import/first
import ProgramPage from '../(athlete)/program'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

beforeEach(() => {
  mockSetParams.mockClear()
  mockBlur = undefined
})

describe('Program tab, first visit after saving', () => {
  it('passes the welcome to the header, then clears it when the visit ends', () => {
    mockParams = { welcome: '1', next: 'Tomorrow' }
    const { getByTestId } = render(<ProgramPage />, { wrapper })
    expect(getByTestId('header').props.children).toBe('true|Tomorrow')
    expect(mockSetParams).not.toHaveBeenCalled()
    mockBlur?.()
    expect(mockSetParams).toHaveBeenCalledWith({
      welcome: undefined,
      kept: undefined,
      next: undefined,
    })
  })

  it('leaves the params alone on an ordinary visit', () => {
    mockParams = {}
    render(<ProgramPage />, { wrapper })
    mockBlur?.()
    expect(mockSetParams).not.toHaveBeenCalled()
  })
})
