import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))
jest.mock('convex/react', () => ({
  useQuery: (fn: unknown) => {
    const name = jest.requireActual('convex/server').getFunctionName(fn)
    return name === 'sports:list' ? jest.requireActual('../../jest/firstRunTestUtils').SPORTS : undefined
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
  return () => <View />
})
jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
// Reduce Motion on: each step happens at once, with no timers.
jest.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))

// eslint-disable-next-line import/first
import FirstRunAbout, { firstQuestion } from '../(first-run)/about'

async function showAbout() {
  render(<FirstRunAbout />, { wrapper })
  await act(async () => {})
}

beforeEach(async () => {
  testDraft.reset()
  mockPush.mockClear()
  await testDraft.seed({ answers: { sportId: 'basketball', seasonStart: null, trainingDays: [1, 3, 5] } })
})

describe('First Run about you (player card)', () => {
  it('asks the age group first, with an empty card and no Continue button', async () => {
    await showAbout()
    expect(screen.getByTestId('about-question').props.children).toBe('AGE GROUP')
    expect(screen.getByTestId('card-age').props.children).toBe('—')
    expect(screen.getByTestId('card-years').props.children).toBe('—')
    expect(screen.queryByTestId('first-run-continue')).toBeNull()
  })

  it('the age answer stamps onto the card, then the years question takes its place', async () => {
    await showAbout()
    await act(async () => {
      fireEvent.press(screen.getByTestId('age-18-35'))
    })
    expect(screen.getByTestId('card-age').props.children).toBe('18–35')
    expect(screen.getByTestId('about-question').props.children).toBe('YEARS TRAINING FOR YOUR SPORT')
    expect(screen.queryByTestId('age-18-35')).toBeNull()
    expect((await testDraft.reopen()).answers.ageGroup).toBe('18-35')
  })

  it('the second answer completes the card and starts the reveal', async () => {
    await showAbout()
    await act(async () => {
      fireEvent.press(screen.getByTestId('age-14-17'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('years-new'))
    })
    expect(screen.getByTestId('card-years').props.children).toBe('Novice')
    expect((await testDraft.reopen()).answers.years).toBe('new')
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/reveal')
  })

  it('resumes on the years question when only the age is answered', async () => {
    await testDraft.seed({ answers: { ageGroup: '36+' } })
    await showAbout()
    expect(screen.getByTestId('about-question').props.children).toBe('YEARS TRAINING FOR YOUR SPORT')
    expect(screen.getByTestId('card-age').props.children).toBe('36+')
  })
})

describe('firstQuestion', () => {
  it('is age unless age is answered and years is not', () => {
    expect(firstQuestion({})).toBe('age')
    expect(firstQuestion({ ageGroup: '14-17' })).toBe('years')
    expect(firstQuestion({ ageGroup: '14-17', years: 'new' })).toBe('age')
  })
})
