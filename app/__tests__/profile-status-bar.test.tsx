import React from 'react'
import { fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

let mockFocused = true

jest.mock('convex/react', () => ({
  useQuery: (name: string) => {
    if (name === 'getCurrentProgramState') {
      return { phase: 'GPP', week: 1, day: 1, skillLevel: 'Novice', sportName: 'Basketball' }
    }
    if (name === 'getIntakeHistory') return []
    if (name === 'getCoreLiftExercises') return []
    return undefined
  },
  useMutation: () => jest.fn(),
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'getCurrentProgramState',
      getIntakeHistory: 'getIntakeHistory',
    },
    userMaxes: { getCoreLiftExercises: 'getCoreLiftExercises' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useIsFocused: () => mockFocused,
}))

// Render the status bar as a host element so its style can be read
jest.mock('expo-status-bar', () => {
  const { View } = require('react-native')
  return {
    StatusBar: ({ style }: { style: string }) => (
      <View testID="status-bar" accessibilityLabel={style} />
    ),
  }
})

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { _id: 'user_1', name: 'Test Athlete', email: 'athlete@example.com' },
    isLoading: false,
  }),
}))

jest.mock('../../components/SignOutButton', () => ({ SignOutButton: () => null }))
jest.mock('../../components/OneRepMaxSheet', () => ({ OneRepMaxSheet: () => null }))

import ProfilePage from '../(athlete)/profile'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config} defaultTheme="light">
    {children}
  </TamaguiProvider>
)

// ProfileHeader adds 400pt of hidden navy above itself for overscroll
const OVERSCROLL = 400
const HEADER_HEIGHT = 300

function renderProfile() {
  const view = render(<ProfilePage />, { wrapper: AllTheProviders })
  fireEvent(view.getByTestId('profile-header'), 'layout', {
    nativeEvent: { layout: { x: 0, y: 0, width: 402, height: OVERSCROLL + HEADER_HEIGHT } },
  })
  const scrollTo = (y: number) =>
    fireEvent.scroll(view.getByTestId('profile-scroll'), {
      nativeEvent: {
        contentOffset: { x: 0, y },
        contentSize: { width: 402, height: 2000 },
        layoutMeasurement: { width: 402, height: 874 },
      },
    })
  const style = () => view.getByTestId('status-bar').props.accessibilityLabel
  return { ...view, scrollTo, style }
}

describe('Profile status bar', () => {
  beforeEach(() => {
    mockFocused = true
  })

  it('is light while the navy header is under it', () => {
    const { style } = renderProfile()
    expect(style()).toBe('light')
  })

  it('goes dark once the header has scrolled out from under it, and light again on the way back', () => {
    const { scrollTo, style } = renderProfile()
    // The status bar covers the top inset (44), so the header leaves it at 300 - 44
    scrollTo(HEADER_HEIGHT - 44 - 1)
    expect(style()).toBe('light')
    scrollTo(HEADER_HEIGHT - 44)
    expect(style()).toBe('dark')
    scrollTo(0)
    expect(style()).toBe('light')
  })

  it('stays light when the list is pulled down past the top', () => {
    const { scrollTo, style } = renderProfile()
    scrollTo(-80)
    expect(style()).toBe('light')
  })

  it('sets nothing while another tab is showing, so the root style applies', () => {
    mockFocused = false
    const { queryByTestId } = render(<ProfilePage />, { wrapper: AllTheProviders })
    expect(queryByTestId('status-bar')).toBeNull()
  })
})
