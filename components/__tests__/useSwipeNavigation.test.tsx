import React from 'react'
import { renderHook } from '@testing-library/react-native'
import { IsFocusedContext } from 'expo-router/build/react-navigation/core/useIsFocused'
import { useSwipeNavigation } from '../../hooks/useSwipeNavigation'

jest.mock('expo-router', () => ({
  useIsFocused: jest.requireActual('expo-router/build/useIsFocused').useIsFocused,
}))

describe('swipe navigation with Router 58', () => {
  it('uses the route focus context and resets translation when refocused', () => {
    let focused = false
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <IsFocusedContext.Provider value={focused}>{children}</IsFocusedContext.Provider>
    )
    const { result, rerender } = renderHook(() => useSwipeNavigation({}), {
      wrapper,
    })
    const reset = jest.spyOn(result.current.translateX, 'setValue')

    focused = true
    rerender(undefined)

    expect(reset).toHaveBeenCalledWith(0)
    expect(result.current.panHandlers).toBeDefined()
  })
})
