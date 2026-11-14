import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockReplace = jest.fn()
const mockScreenOptions = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  Stack: { Screen: ({ options }: { options: unknown }) => (mockScreenOptions(options), null) },
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}))

import NotFoundScreen from '../+not-found'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Not found screen', () => {
  beforeEach(() => {
    mockReplace.mockReset()
    mockScreenOptions.mockReset()
  })

  it('hides the native header, whose back button showed a route-group name', () => {
    render(<NotFoundScreen />, { wrapper: AllTheProviders })
    expect(mockScreenOptions).toHaveBeenCalledWith({ headerShown: false })
  })

  it('keeps its content below the status bar and Dynamic Island', () => {
    const { getByTestId } = render(<NotFoundScreen />, { wrapper: AllTheProviders })
    const style = [getByTestId('not-found').props.style].flat(Infinity).reduce((all: any, s: any) => ({ ...all, ...s }), {})
    expect(style.paddingTop).toBeGreaterThanOrEqual(59)
  })

  it('offers one clear way back into the app', () => {
    const { getByText } = render(<NotFoundScreen />, { wrapper: AllTheProviders })
    expect(getByText("This link doesn't lead anywhere in the app.")).toBeTruthy()
    fireEvent.press(getByText('Go to the app'))
    expect(mockReplace).toHaveBeenCalledWith('/')
  })
})
