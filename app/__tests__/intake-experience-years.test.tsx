import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({ sportId: 'sport_1', ageGroup: '18-35' }),
  useIsFocused: () => true,
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

import ExperienceYearsScreen from '../(intake)/experience-years'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Intake experience: trophy case', () => {
  it('shows no empty placeholder box at zero years', () => {
    const { queryByTestId, queryByText } = render(<ExperienceYearsScreen />, { wrapper: AllTheProviders })
    expect(queryByTestId('trophy-case')).toBeNull()
    expect(queryByText(/trophy case awaits/i)).toBeNull()
  })

  it('shows the trophy case once the athlete adds a year', () => {
    const { getByLabelText, getByTestId } = render(<ExperienceYearsScreen />, { wrapper: AllTheProviders })
    fireEvent.press(getByLabelText('More years'))
    expect(getByTestId('trophy-case')).toBeTruthy()
  })
})
