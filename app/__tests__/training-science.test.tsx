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

  it('opens with the intro line, without a second title under the header', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

    expect(getByText(/built on sports science principles/i)).toBeTruthy()
  })

  it('renders all main section titles', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

    expect(getByText('The three phases')).toBeTruthy()
    expect(getByText('Understanding your numbers')).toBeTruthy()
    expect(getByText('Training intensity')).toBeTruthy()
    expect(getByText('Your profile factors')).toBeTruthy()
    expect(getByText('Rest periods')).toBeTruthy()
  })

  it('renders the three phases content (defaultExpanded)', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

    // The Three Phases section is defaultExpanded
    expect(getByText('GPP: General Physical Preparedness')).toBeTruthy()
    expect(getByText('SPP: Specific Physical Preparedness')).toBeTruthy()
    expect(getByText('SSP: Sport-Specific Preparedness')).toBeTruthy()
  })

  it('never uses the retired phase expansions', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })
    const { queryByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })
    expect(queryByText(/Sports Physical Preparedness/)).toBeNull()
    expect(queryByText(/Sports Specific Preparation/)).toBeNull()
    expect(queryByText(/General Physical Preparation\b/)).toBeNull()
  })

  it('shows each phase as load, reps or focus, and tempo instead of one dense line', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText, getAllByText, queryByText } = render(<TrainingSciencePage />, {
      wrapper: AllTheProviders,
    })

    expect(getByText('60–75%')).toBeTruthy()
    expect(getByText('75–85%')).toBeTruthy()
    expect(getByText('85–90%')).toBeTruthy()
    expect(getAllByText('Load')).toHaveLength(3)
    expect(getAllByText('Tempo')).toHaveLength(3)
    expect(queryByText(/Lighter loads/)).toBeNull()
  })

  it('renders sport category section when program state exists', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: 2 })

    const { getByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

    expect(getByText('Your sport category')).toBeTruthy()
  })

  it('does not render sport category section when no program state', () => {
    mockUseQuery.mockReturnValue(null)

    const { queryByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

    expect(queryByText('Your sport category')).toBeNull()
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

      const { getByText, unmount } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

      // The section header should always be visible
      expect(getByText('Your sport category')).toBeTruthy()

      unmount()
    })
  })

  it('hides sport category section when category is undefined', () => {
    mockUseQuery.mockReturnValue({ gppCategoryId: undefined })

    const { queryByText } = render(<TrainingSciencePage />, { wrapper: AllTheProviders })

    expect(queryByText('Your sport category')).toBeNull()
  })
})
