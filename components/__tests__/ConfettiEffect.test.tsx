import React from 'react'
import { render } from '@testing-library/react-native'
import { ConfettiEffect } from '../workout/ConfettiEffect'

// Mock react-native-confetti-cannon
jest.mock('react-native-confetti-cannon', () => {
  const { forwardRef, useImperativeHandle } = jest.requireActual('react')
  return forwardRef((props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      start: jest.fn(),
    }))
    return null
  })
})

describe('ConfettiEffect', () => {
  it('renders nothing when trigger is false', () => {
    const { toJSON } = render(<ConfettiEffect trigger={false} />)
    expect(toJSON()).toBeNull()
  })

  it('renders confetti container when trigger is true', () => {
    const { toJSON } = render(<ConfettiEffect trigger={true} />)
    expect(toJSON()).not.toBeNull()
  })

  it('accepts onComplete callback prop', () => {
    const mockOnComplete = jest.fn()
    const { toJSON } = render(
      <ConfettiEffect trigger={true} onComplete={mockOnComplete} />
    )
    expect(toJSON()).not.toBeNull()
  })
})
