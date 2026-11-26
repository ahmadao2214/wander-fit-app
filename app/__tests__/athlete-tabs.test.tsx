import React from 'react'
import { render } from '@testing-library/react-native'
import AthleteLayout from '../(athlete)/_layout'
import { sportTheme } from '../../lib/sportTokens'

jest.mock('expo-router', () => ({
  Tabs: Object.assign(
    jest.fn(({ children }: { children: React.ReactNode }) => children),
    { Screen: jest.fn(() => null) },
  ),
}))

jest.mock('../../components/AuthGuard', () => ({
  AthleteOnlyRoute: ({ children }: { children: React.ReactNode }) => children,
}))

// Issue #210: the active tab is the neutral primary, the board's button face
// (ink in light, chalk in dark), not Electric Blue.
const NEUTRAL = {
  light: sportTheme('basketball', 'whiteboard').button.hex,
  dark: sportTheme('basketball', 'chalkboard').button.hex,
}

jest.mock('../../tamagui.config', () => {
  const { sportTheme: theme } = jest.requireActual('../../lib/sportTokens')
  return {
    tabTints: {
      light: { active: theme('basketball', 'whiteboard').button.hex, inactive: '#64748B' },
      dark: { active: theme('basketball', 'chalkboard').button.hex, inactive: '#94A3B8' },
    },
  }
})

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

  it('tints the active tab with the neutral primary, not Electric Blue', () => {
    render(<AthleteLayout />)
    const { Tabs } = jest.requireMock('expo-router')
    const options = Tabs.mock.calls[0][0].screenOptions
    expect(options.tabBarActiveTintColor).toBe(NEUTRAL.light)
    expect(options.tabBarActiveTintColor.toUpperCase()).not.toBe('#2563EB')
  })

  it('matches the real tab tints in the theme config', () => {
    const { tabTints } = jest.requireActual('../../tamagui.config')
    expect([tabTints.light.active, tabTints.dark.active]).toEqual([NEUTRAL.light, NEUTRAL.dark])
  })
})
