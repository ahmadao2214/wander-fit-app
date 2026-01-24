import React from 'react'
import { render } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

// Mock useQuery before any imports
const mockUseQuery = jest.fn()

jest.mock('convex/react', () => ({
  useQuery: (...args: any[]) => mockUseQuery(...args),
}))

// Mock the Convex API module
jest.mock('../../convex/_generated/api', () => ({
  api: {
    userPrograms: {
      getCurrentProgramState: 'mocked-getCurrentProgramState',
    },
  },
}))

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user', name: 'Test User' },
    isLoading: false,
  }),
}))

import TrainingSciencePage from '../(athlete)/training-science/index'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <TamaguiProvider config={config}>{children}</TamaguiProvider>
}

describe('TrainingSciencePage', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
  })

  it('renders the hero section', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(
      <TrainingSciencePage />,
      { wrapper: AllTheProviders }
    )

    expect(getByText('UNDERSTAND YOUR PROGRAM')).toBeTruthy()
    expect(getByText(/built on sports science principles/i)).toBeTruthy()
  })

  it('renders all main section titles', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(
      <TrainingSciencePage />,
      { wrapper: AllTheProviders }
    )

    expect(getByText('THE THREE PHASES')).toBeTruthy()
    expect(getByText('UNDERSTANDING YOUR NUMBERS')).toBeTruthy()
    expect(getByText('TRAINING INTENSITY')).toBeTruthy()
    expect(getByText('YOUR PROFILE FACTORS')).toBeTruthy()
    expect(getByText('REST PERIODS')).toBeTruthy()
  })

  it('renders the three phases content (defaultExpanded)', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(
      <TrainingSciencePage />,
      { wrapper: AllTheProviders }
    )

    // The Three Phases section is defaultExpanded
    expect(getByText('GPP: Building Your Foundation')).toBeTruthy()
    expect(getByText('SPP: Sports Physical Preparedness')).toBeTruthy()
    expect(getByText('SSP: Sports Specific Preparation')).toBeTruthy()
  })

  it('renders sport category section when program state exists', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(
      <TrainingSciencePage />,
      { wrapper: AllTheProviders }
    )

    expect(getByText('YOUR SPORT CATEGORY')).toBeTruthy()
  })

  it('does not render sport category section when no program state', () => {
    mockUseQuery.mockReturnValue(null)

    const { queryByText } = render(
      <TrainingSciencePage />,
      { wrapper: AllTheProviders }
    )

    expect(queryByText('YOUR SPORT CATEGORY')).toBeNull()
  })
})

describe('TrainingSciencePage Category Personalization', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
  })

  it('displays sport category section for all categories', () => {
    // Test that the section renders for each category
    const categories = [1, 2, 3, 4]

    categories.forEach((categoryId) => {
      mockUseQuery.mockReturnValue({ gppCategoryId: categoryId })

      const { getByText, unmount } = render(
        <TrainingSciencePage />,
        { wrapper: AllTheProviders }
      )

      // The section header should always be visible
      expect(getByText('YOUR SPORT CATEGORY')).toBeTruthy()

      unmount()
    })
  })

  it('hides sport category section when category is undefined', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: undefined })

    const { queryByText } = render(
      <TrainingSciencePage />,
      { wrapper: AllTheProviders }
    )

    expect(queryByText('YOUR SPORT CATEGORY')).toBeNull()
  })
})
