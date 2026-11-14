import React from 'react'
import { StyleSheet } from 'react-native'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

jest.mock('convex/react', () => ({
  useQuery: (name: string) => {
    if (name === 'sports.getById') return { _id: 'sport_1', name: 'Basketball', gppCategoryId: 2 }
    if (name === 'sports.getCategoryById') {
      return {
        shortName: 'Power',
        description: 'Sports requiring explosive vertical movements and rapid deceleration.',
      }
    }
    if (name === 'userMaxes.getCoreLiftExercises') return []
    return undefined
  },
}))

jest.mock('../../convex/_generated/api', () => ({
  api: {
    sports: { getById: 'sports.getById', getCategoryById: 'sports.getCategoryById' },
    userMaxes: { getCoreLiftExercises: 'userMaxes.getCoreLiftExercises' },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({
    sportId: 'sport_1',
    yearsOfExperience: '2',
    trainingDays: '3',
    selectedTrainingDays: '1,3,5',
    weeksUntilSeason: '12',
    ageGroup: '18-35',
  }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

import ResultsScreen from '../(intake)/results'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

describe('Intake results: training category card', () => {
  it('gives the category name a line height at least as tall as its font size, so it is not clipped', () => {
    const { getByTestId } = render(<ResultsScreen />, { wrapper: AllTheProviders })
    const name = getByTestId('training-category-name')
    const style = StyleSheet.flatten(name.props.style)
    expect(name.props.children).toBe('POWER')
    expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize)
  })
})
