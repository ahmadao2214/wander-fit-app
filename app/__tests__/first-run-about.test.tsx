import React from 'react'
import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { testDraft, Wrapper as wrapper } from '../../jest/firstRunTestUtils'
import { getSkillLevel } from '../../lib/calculations'
import { yearsForChoice } from '../../lib/firstRun'

jest.mock('../../lib/firstRunStorage', () => ({
  get firstRunDraft() {
    return jest.requireActual('../../jest/firstRunTestUtils').testDraft.current
  },
}))
jest.mock('convex/react', () => ({ useQuery: () => undefined }))
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}))
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}))

// eslint-disable-next-line import/first
import FirstRunAbout from '../(first-run)/about'

async function show() {
  render(<FirstRunAbout />, { wrapper })
  await act(async () => {})
}

const press = (id: string) =>
  act(async () => {
    fireEvent.press(screen.getByTestId(id))
  })

beforeEach(() => {
  testDraft.reset()
  mockPush.mockClear()
})

describe('First Run about you', () => {
  it('offers the three age groups and three years choices', async () => {
    await show()
    for (const id of ['age-14-17', 'age-18-35', 'age-36+', 'years-new', 'years-1-2', 'years-3+']) {
      expect(screen.getByTestId(id)).toBeTruthy()
    }
    expect(screen.getByText('Youth')).toBeTruthy()
    expect(screen.getByText('Vitality')).toBeTruthy()
  })

  it('needs both answers before See my plan', async () => {
    await show()
    const disabled = () => screen.getByTestId('first-run-see-plan').props.accessibilityState.disabled
    expect(disabled()).toBe(true)
    await press('age-18-35')
    expect(disabled()).toBe(true)
    await press('years-1-2')
    expect(disabled()).toBe(false)
    await press('first-run-see-plan')
    expect(mockPush).toHaveBeenCalledWith('/(first-run)/reveal')
  })

  it('stores values completeIntake accepts', async () => {
    await show()
    await press('age-36+')
    await press('years-3+')
    const { answers } = await testDraft.reopen()
    expect(answers.ageGroup).toBe('36+')
    expect(getSkillLevel(yearsForChoice(answers.years!))).toBe('Advanced')
  })
})
