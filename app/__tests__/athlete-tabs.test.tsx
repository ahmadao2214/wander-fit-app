import React from 'react'
import { render } from '@testing-library/react-native'
import AthleteLayout from '../(athlete)/_layout'

jest.mock('expo-router', () => ({
  Tabs: Object.assign(({ children }: { children: React.ReactNode }) => children, {
    Screen: jest.fn(() => null),
  }),
}))

jest.mock('../../components/AuthGuard', () => ({
  AthleteOnlyRoute: ({ children }: { children: React.ReactNode }) => children,
}))

jest.mock('../../tamagui.config', () => ({ brandPrimary: '#2563eb' }))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}))

describe('athlete tab destinations', () => {
  beforeEach(() => jest.clearAllMocks())

  it.each(['workout', 'training-science'])('keeps %s reachable without a tab button', (name) => {
    render(<AthleteLayout />)

    const screen = jest.requireMock('expo-router').Tabs.Screen.mock.calls
      .map(([props]: [{ name: string; options: any }]) => props)
      .find((props: { name: string }) => props.name === name)

    expect(screen.options.href).toBeUndefined()
    expect(screen.options.hidden).not.toBe(true)
    expect(screen.options.tabBarButton()).toBeNull()
    expect(screen.options.tabBarItemStyle).toEqual({ display: 'none' })
  })
})
