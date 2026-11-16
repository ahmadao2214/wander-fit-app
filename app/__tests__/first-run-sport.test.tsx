import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { SPORTS, testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))

jest.mock('convex/react', () => ({
  useQuery: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    const utils = jest.requireActual('../../jest/firstRunTestUtils')
    if (name === 'sports:list') return utils.SPORTS
    if (name === 'sports:getCategories') return utils.CATEGORIES
    return undefined
  },
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => jest.requireActual('react').useEffect(cb, [cb]),
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))
jest.mock('lottie-react-native', () => {
  const { View } = jest.requireActual('react-native')
  return ({ autoPlay }: { autoPlay?: boolean }) => <View testID={autoPlay ? 'sport-icon-playing' : 'sport-icon-still'} />
})
jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
let mockReduced: boolean | null = false
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => mockReduced }))

// eslint-disable-next-line import/first
import FirstRunSport, { matchesSearch } from '../(first-run)/sport'

async function renderSport() {
  render(<FirstRunSport />, { wrapper })
  await act(async () => {})
}

beforeEach(() => {
  testDraft.reset()
  mockPush.mockClear()
})

describe('First Run sport', () => {
  beforeEach(() => {
    mockReduced = false
  })

  it('shows a Popular row first, then all sports, every icon still until a tap', async () => {
    await renderSport()
    expect(screen.getByText('POPULAR')).toBeTruthy()
    expect(screen.getByText('ALL SPORTS')).toBeTruthy()
    for (const sport of SPORTS) expect(screen.getByTestId(`sport-${sport.name}`)).toBeTruthy()
    expect(screen.getAllByTestId('sport-icon-still')).toHaveLength(SPORTS.length)
    expect(screen.queryByTestId('sport-icon-playing')).toBeNull()
    expect(screen.getByTestId('first-run-continue')).toBeDisabled()
  })

  it('search narrows All sports and leaves the Popular row alone', async () => {
    await renderSport()
    fireEvent.changeText(screen.getByTestId('sport-search'), 'fit')
    expect(screen.getByTestId('sport-General Fitness')).toBeTruthy()
    // Popular sports stay put while searching.
    expect(screen.getByTestId('sport-Basketball')).toBeTruthy()
    fireEvent.changeText(screen.getByTestId('sport-search'), 'curling')
    expect(screen.queryByTestId('sport-General Fitness')).toBeNull()
    expect(screen.getByText(/General Fitness if yours isn't listed/)).toBeTruthy()
  })

  it('a tap stores the sport, plays only its icon once, and Continue turns to Season', async () => {
    await renderSport()
    await act(async () => {
      fireEvent.press(screen.getByTestId('sport-Basketball'))
    })
    expect(screen.getByTestId('sport-Basketball').props.accessibilityState.selected).toBe(true)
    expect(screen.getAllByTestId('sport-icon-playing')).toHaveLength(1)
    expect((await testDraft.reopen()).answers.sportId).toBe('basketball')

    fireEvent.press(screen.getByTestId('first-run-continue'))
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/(first-run)/season', params: { fly: '1' } })
  })

  it('with Reduce Motion the tapped icon stays still', async () => {
    mockReduced = true
    await renderSport()
    await act(async () => {
      fireEvent.press(screen.getByTestId('sport-Soccer'))
    })
    expect(screen.queryByTestId('sport-icon-playing')).toBeNull()
  })

  it('records the step so a relaunch resumes on it', async () => {
    await renderSport()
    expect((await testDraft.reopen()).lastStep).toBe('sport')
  })
})

describe('matchesSearch', () => {
  it('ignores case, accents and surrounding spaces', () => {
    expect(matchesSearch('Track (Sprints/Jumps)', ' sprint ')).toBe(true)
    expect(matchesSearch('Pétanque', 'petan')).toBe(true)
    expect(matchesSearch('Soccer', 'bas')).toBe(false)
    expect(matchesSearch('Soccer', '')).toBe(true)
  })
})
