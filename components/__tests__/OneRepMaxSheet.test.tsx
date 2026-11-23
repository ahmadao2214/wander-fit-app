import React from 'react'
import { act, fireEvent, render, waitFor } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../tamagui.config'

const mockSetMultipleMaxes = jest.fn()
const mockSetMaxBySlug = jest.fn()

jest.mock('convex/react', () => ({
  useMutation: (name: string) => {
    if (name === 'setMultipleMaxes') return mockSetMultipleMaxes
    if (name === 'setMaxBySlug') return mockSetMaxBySlug
    return jest.fn()
  },
}))

jest.mock('../../convex/_generated/api', () => ({
  api: { userMaxes: { setMultipleMaxes: 'setMultipleMaxes', setMaxBySlug: 'setMaxBySlug' } },
}))

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}))

import { OneRepMaxSheet } from '../OneRepMaxSheet'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

// Sheet mount + Tamagui animations take ~5s on a cold CI runner.
jest.setTimeout(20000)

const lifts = [
  { _id: 'ex_1', name: 'Back Squat', slug: 'back_squat', currentMax: null },
  { _id: 'ex_2', name: 'Bench Press', slug: 'bench_press', currentMax: null },
  { _id: 'ex_3', name: 'Trap Bar Deadlift', slug: 'trap_bar_deadlift', currentMax: null },
]

describe('OneRepMaxSheet, all lifts at once', () => {
  beforeEach(() => {
    mockSetMultipleMaxes.mockReset()
    mockSetMultipleMaxes.mockResolvedValue({ hasInvalidValues: false, summary: {} })
  })

  it('saves the values typed for each lift and closes', async () => {
    const onOpenChange = jest.fn()
    const onComplete = jest.fn()
    const { findByTestId, getByTestId } = render(
      <OneRepMaxSheet
        open
        onOpenChange={onOpenChange}
        mode="bulk"
        exercises={lifts}
        onComplete={onComplete}
      />,
      { wrapper: AllTheProviders }
    )

    fireEvent.changeText(await findByTestId('max-input-back_squat'), '245')
    fireEvent.changeText(getByTestId('max-input-bench_press'), '165')
    await act(async () => {
      fireEvent.press(getByTestId('max-save'))
    })

    await waitFor(() => expect(mockSetMultipleMaxes).toHaveBeenCalledTimes(1))
    // A lift left blank goes up as 0, which the server reads as "not entered"
    expect(mockSetMultipleMaxes).toHaveBeenCalledWith({
      maxes: [
        { exerciseSlug: 'back_squat', oneRepMax: 245 },
        { exerciseSlug: 'bench_press', oneRepMax: 165 },
        { exerciseSlug: 'trap_bar_deadlift', oneRepMax: 0 },
      ],
    })
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('closes from its labelled close button without saving', async () => {
    const onOpenChange = jest.fn()
    const { findByLabelText } = render(
      <OneRepMaxSheet open onOpenChange={onOpenChange} mode="bulk" exercises={lifts} />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(await findByLabelText('Close'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(mockSetMultipleMaxes).not.toHaveBeenCalled()
  })
})
