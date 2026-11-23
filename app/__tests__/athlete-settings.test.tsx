import React from 'react'
import { Platform, Share } from 'react-native'
import { act, fireEvent, render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: jest.fn() }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('convex/react', () => ({
  useQuery: () => undefined,
  useMutation: () => jest.fn(),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isLoading: false, hasCompletedIntake: true }),
}))

import AthleteSettingsScreen from '../(athlete)/settings'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('App Settings', () => {
  const saved = process.env.EXPO_PUBLIC_CONVEX_URL
  afterEach(() => {
    process.env.EXPO_PUBLIC_CONVEX_URL = saved
  })

  it('shows the connector address for this deployment', () => {
    process.env.EXPO_PUBLIC_CONVEX_URL = 'https://accomplished-tapir-54.convex.cloud'
    const { getByTestId, getByText } = render(<AthleteSettingsScreen />, { wrapper })
    expect(getByTestId('mcp-address').props.children).toBe(
      'https://accomplished-tapir-54.convex.site/mcp'
    )
    expect(getByText(/add a custom connector/)).toBeTruthy()
    expect(getByText(/waits for you to accept/)).toBeTruthy()
  })

  it('says so when the build has no address', () => {
    delete process.env.EXPO_PUBLIC_CONVEX_URL
    const { getByText, queryByTestId } = render(<AthleteSettingsScreen />, { wrapper })
    expect(queryByTestId('mcp-address')).toBeNull()
    expect(getByText('This build has no connector address.')).toBeTruthy()
  })

  it('opens the share sheet with the address on native', async () => {
    process.env.EXPO_PUBLIC_CONVEX_URL = 'https://accomplished-tapir-54.convex.cloud'
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined })
    const { getByLabelText } = render(<AthleteSettingsScreen />, { wrapper })
    await act(async () => {
      fireEvent.press(getByLabelText('Share connector address'))
    })
    expect(share).toHaveBeenCalledWith({
      message: 'https://accomplished-tapir-54.convex.site/mcp',
    })
    share.mockRestore()
  })

  it('copies the address on web and announces it', async () => {
    process.env.EXPO_PUBLIC_CONVEX_URL = 'https://accomplished-tapir-54.convex.cloud'
    const os = Platform.OS
    Platform.OS = 'web'
    const writeText = jest.fn().mockResolvedValue(undefined)
    const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      configurable: true,
    })
    try {
      jest.useFakeTimers()
      const { getByLabelText, getByTestId, getByText } = render(<AthleteSettingsScreen />, {
        wrapper,
      })
      await act(async () => {
        fireEvent.press(getByLabelText('Copy connector address'))
      })
      expect(writeText).toHaveBeenCalledWith('https://accomplished-tapir-54.convex.site/mcp')
      expect(getByTestId('mcp-address-status').props.children).toBe('Connector address copied')
      expect(getByText('Copied')).toBeTruthy()
      await act(async () => {
        jest.advanceTimersByTime(2000)
      })
      expect(getByTestId('mcp-address-status').props.children).toBe('')
      expect(getByText('Copy')).toBeTruthy()
    } finally {
      jest.useRealTimers()
      Platform.OS = os
      if (nav) Object.defineProperty(globalThis, 'navigator', nav)
    }
  })
})
