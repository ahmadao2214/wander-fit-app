import React from 'react'
import { StyleSheet } from 'react-native'
import { render, fireEvent } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { SetTracker } from '../SetTracker'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

const sets = (states: ('done' | 'skipped' | 'todo')[]) =>
  states.map((state) => ({ completed: state === 'done', skipped: state === 'skipped' }))

describe('SetTracker', () => {
  it('marks the first set not yet logged as the next one', () => {
    const { getByText, getByLabelText, queryByText } = render(
      <SetTracker sets={sets(['done', 'todo', 'todo'])} prescribedReps="10" prescribedSets={3} onSetUpdate={jest.fn()} />,
      { wrapper: AllTheProviders }
    )
    expect(getByText('SET 2 · NEXT')).toBeTruthy()
    expect(queryByText('SET 3 · NEXT')).toBeNull()
    expect(getByLabelText('Set 2, 10, next, tap when done')).toBeTruthy()
    expect(getByLabelText('Set 1, 10, done')).toBeTruthy()
  })

  it('logs the next set with the prescribed reps when tapped', () => {
    const onSetUpdate = jest.fn()
    const { getByLabelText } = render(
      <SetTracker sets={sets(['done', 'todo'])} prescribedReps="8" prescribedSets={2} onSetUpdate={onSetUpdate} />,
      { wrapper: AllTheProviders }
    )
    fireEvent.press(getByLabelText('Set 2, 8, next, tap when done'))
    expect(onSetUpdate).toHaveBeenCalledWith(1, { completed: true, skipped: false, repsCompleted: 8 })
  })

  it('has no next set once every set is logged or skipped', () => {
    const { queryByText } = render(
      <SetTracker sets={sets(['done', 'skipped'])} prescribedReps="8" prescribedSets={2} onSetUpdate={jest.fn()} />,
      { wrapper: AllTheProviders }
    )
    expect(queryByText(/NEXT/)).toBeNull()
  })

  it('sizes the tiles to fill the measured row, three across', () => {
    const { UNSAFE_getAllByProps, getByText } = render(
      <SetTracker sets={sets(['todo', 'todo', 'todo'])} prescribedReps="30s each side" prescribedSets={3} onSetUpdate={jest.fn()} />,
      { wrapper: AllTheProviders }
    )
    const row = UNSAFE_getAllByProps({ flexWrap: 'wrap' })[0]
    fireEvent(row, 'layout', { nativeEvent: { layout: { width: 340, height: 100, x: 0, y: 0 } } })
    const tile = getByText('SET 1 · NEXT')
    let node: any = tile
    while (node && node.props?.accessibilityRole !== 'button') node = node.parent
    expect(StyleSheet.flatten(node.props.style).width).toBe(108)
  })
})
