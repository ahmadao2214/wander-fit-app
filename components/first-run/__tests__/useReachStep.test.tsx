import React, { useEffect } from 'react'
import { act, render } from '@testing-library/react-native'
import { analytics } from '../../../lib/analytics'
import { useReachStep } from '../useReachStep'

const mockReach = jest.fn()

jest.mock('expo-router', () => ({
  // The screen is focused for the whole test: run the callback like an effect.
  useFocusEffect: (callback: () => void) => {
    const { useEffect: useMockEffect } = jest.requireActual('react')
    useMockEffect(() => callback(), [callback])
  },
}))

jest.mock('../../../hooks/useFirstRunDraft', () => ({
  useFirstRunDraft: () => ({ reach: mockReach }),
}))

function SportStep({ onRender }: { onRender?: () => void }) {
  useReachStep('sport')
  useEffect(() => onRender?.())
  return null
}

describe('useReachStep', () => {
  let trackSpy: jest.SpyInstance

  beforeEach(() => {
    trackSpy = jest.spyOn(analytics, 'trackFirstRunStepViewed').mockImplementation(() => {})
  })

  afterEach(() => {
    trackSpy.mockRestore()
    analytics.setCaptureReady(true)
  })

  it('sends a view seen before capture is ready once capture becomes ready, and only once', () => {
    analytics.setCaptureReady(false)
    render(<SportStep />)
    expect(mockReach).toHaveBeenCalledWith('sport')
    expect(trackSpy).not.toHaveBeenCalled()

    act(() => analytics.setCaptureReady(true))
    expect(trackSpy).toHaveBeenCalledTimes(1)
    expect(trackSpy).toHaveBeenCalledWith(expect.objectContaining({ step: 'sport' }))

    act(() => analytics.setCaptureReady(false))
    act(() => analytics.setCaptureReady(true))
    expect(trackSpy).toHaveBeenCalledTimes(1)
  })
})
