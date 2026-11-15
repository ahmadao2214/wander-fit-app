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
    expect(getByText('Set 2 · Next')).toBeTruthy()
    expect(queryByText('Set 3 · Next')).toBeNull()
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

  it('sizes each tile to a third of the measured row', () => {
    const { UNSAFE_getAllByProps, getByText } = render(
      <SetTracker sets={sets(['todo', 'todo', 'todo'])} prescribedReps="30s each side" prescribedSets={3} onSetUpdate={jest.fn()} />,
      { wrapper: AllTheProviders }
    )
    const row = UNSAFE_getAllByProps({ flexWrap: 'wrap' })[0]
    fireEvent(row, 'layout', { nativeEvent: { layout: { width: 340, height: 100, x: 0, y: 0 } } })
    const tile = getByText('Set 1 · Next')
    let node: any = tile
    while (node && node.props?.accessibilityRole !== 'button') node = node.parent
    expect(StyleSheet.flatten(node.props.style).width).toBe(108)
  })

  it('keeps a single set to a third of the row rather than full width', () => {
    const { UNSAFE_getAllByProps, getByText } = render(
      <SetTracker sets={sets(['todo'])} prescribedReps="30s each side" prescribedSets={1} onSetUpdate={jest.fn()} />,
      { wrapper: AllTheProviders }
    )
    const row = UNSAFE_getAllByProps({ flexWrap: 'wrap' })[0]
    fireEvent(row, 'layout', { nativeEvent: { layout: { width: 340, height: 100, x: 0, y: 0 } } })
    let node: any = getByText('Set 1 · Next')
    while (node && node.props?.accessibilityRole !== 'button') node = node.parent
    expect(StyleSheet.flatten(node.props.style).width).toBe(108)
  })

  it('puts a logged weight on its own line under the reps, shrinking to fit', () => {
    const { getByTestId, getByText } = render(
      <SetTracker
        sets={[{ completed: true, skipped: false, repsCompleted: 12, weight: 225 }]}
        prescribedReps="12"
        prescribedSets={1}
        onSetUpdate={jest.fn()}
      />,
      { wrapper: AllTheProviders }
    )
    const weight = getByTestId('set-0-weight')
    expect(weight.props.children).toEqual([225, ' lb'])
    expect(weight.props.numberOfLines).toBe(1)
    expect(weight.props.adjustsFontSizeToFit).toBe(true)
    // Not beside the reps: the weight's row is not the row holding "12"
    const rowOf = (node: any) => {
      let current = node.parent
      while (current && typeof current.type !== 'string') current = current.parent
      return current
    }
    expect(rowOf(weight)).not.toBe(rowOf(getByText('12')))
  })

  it('announces the logged reps and weight for a completed set, and the prescription otherwise', () => {
    const { getByLabelText } = render(
      <SetTracker
        sets={[
          { completed: true, skipped: false, repsCompleted: 8, weight: 225 },
          { completed: false, skipped: false },
        ]}
        prescribedReps="12"
        prescribedSets={2}
        onSetUpdate={jest.fn()}
      />,
      { wrapper: AllTheProviders }
    )
    expect(getByLabelText('Set 1, 8 at 225 lb, done')).toBeTruthy()
    expect(getByLabelText('Set 2, 12, next, tap when done')).toBeTruthy()
  })

  it('never shrinks a long prescription below the 12pt floor', () => {
    const { getAllByText } = render(
      <SetTracker sets={sets(['todo', 'todo'])} prescribedReps="10 each side" prescribedSets={2} onSetUpdate={jest.fn()} />,
      { wrapper: AllTheProviders }
    )
    const tiles = getAllByText('10 each side')
    expect(tiles.length).toBe(2)
    for (const node of tiles) {
      const { fontSize } = StyleSheet.flatten(node.props.style)
      expect(fontSize * node.props.minimumFontScale).toBeGreaterThanOrEqual(12)
    }
  })

})
