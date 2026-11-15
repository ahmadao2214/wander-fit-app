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
jest.mock('../../components/sport-icon/SportIcon', () => ({
  SportIcon: ({ mode }: { mode: string }) => {
    const { View } = jest.requireActual('react-native')
    return <View testID={`sport-icon-${mode}`} />
  },
}))

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
  it('shows every sport as a still icon, and Continue waits for a choice', async () => {
    await renderSport()
    for (const sport of SPORTS) expect(screen.getByTestId(`sport-${sport.name}`)).toBeTruthy()
    expect(screen.getAllByTestId('sport-icon-still')).toHaveLength(SPORTS.length)
    expect(screen.queryByTestId('sport-icon-once')).toBeNull()
    expect(screen.getByTestId('first-run-continue').props.accessibilityState.disabled).toBe(true)
    expect(screen.getByTestId('program-bar-empty')).toBeTruthy()
  })

  it('narrows the grid as the athlete searches', async () => {
    await renderSport()
    fireEvent.changeText(screen.getByTestId('sport-search'), 'bas')
    expect(screen.getByTestId('sport-Basketball')).toBeTruthy()
    expect(screen.getByTestId('sport-Baseball')).toBeTruthy()
    expect(screen.queryByTestId('sport-Soccer')).toBeNull()
  })

  it('points to General Fitness when nothing matches', async () => {
    await renderSport()
    fireEvent.changeText(screen.getByTestId('sport-search'), 'curling')
    expect(screen.getByText(/General Fitness if yours isn't listed/)).toBeTruthy()
  })

  it('selecting stores the sport, shows it in Your program, and enables Continue', async () => {
    await renderSport()
    await act(async () => {
      fireEvent.press(screen.getByTestId('sport-Basketball'))
    })
    expect(screen.getByTestId('program-bar-text').props.children).toBe('Basketball · Power')
    expect(screen.getByTestId('sport-Basketball').props.accessibilityState.selected).toBe(true)
    expect((await testDraft.reopen()).answers.sportId).toBe('basketball')

    fireEvent.press(screen.getByTestId('first-run-continue'))
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/season')
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
