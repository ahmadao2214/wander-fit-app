import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'
import { createDraftStore, type DraftStorage } from '../../lib/firstRunDraft'

const memory = new Map<string, string>()
const storage: DraftStorage = {
  getItem: async (k) => memory.get(k) ?? null,
  setItem: async (k, v) => {
    memory.set(k, v)
  },
  removeItem: async (k) => {
    memory.delete(k)
  },
}
let mockStore = createDraftStore(storage, () => 1000)
jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return mockStore
  },
}))

const SPORTS = [
  { _id: 'basketball', name: 'Basketball', gppCategoryId: 2 },
  { _id: 'baseball', name: 'Baseball', gppCategoryId: 3 },
  { _id: 'soccer', name: 'Soccer', gppCategoryId: 1 },
  { _id: 'fitness', name: 'General Fitness', gppCategoryId: 4 },
]
const CATEGORIES = [
  { categoryId: 1, shortName: 'Endurance' },
  { categoryId: 2, shortName: 'Power' },
  { categoryId: 3, shortName: 'Rotation' },
  { categoryId: 4, shortName: 'Strength' },
]
jest.mock('convex/react', () => ({
  useQuery: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    if (name === 'sports:list') return SPORTS
    if (name === 'sports:getCategories') return CATEGORIES
    return undefined
  },
}))

const mockPush = jest.fn()
jest.mock('expo-router', () => ({
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

async function renderSport() {
  render(<FirstRunSport />, { wrapper })
  await act(async () => {})
}

beforeEach(() => {
  memory.clear()
  mockStore = createDraftStore(storage, () => 1000)
  mockPush.mockClear()
})

describe('First Run sport', () => {
  it('shows every sport as a still icon, and Continue waits for a choice', async () => {
    await renderSport()
    for (const sport of SPORTS) expect(screen.getByTestId(`sport-${sport.name}`)).toBeTruthy()
    expect(screen.getAllByTestId('sport-icon-still')).toHaveLength(SPORTS.length)
    expect(screen.queryByTestId('sport-icon-once')).toBeNull()
    expect(screen.getByTestId('first-run-continue').props.accessibilityState.disabled).toBe(true)
    expect(screen.queryByTestId('program-bar')).toBeNull()
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
    expect((await createDraftStore(storage).load()).answers.sportId).toBe('basketball')

    fireEvent.press(screen.getByTestId('first-run-continue'))
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/season')
  })

  it('records the step so a relaunch resumes on it', async () => {
    await renderSport()
    expect((await createDraftStore(storage).load()).lastStep).toBe('sport')
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
