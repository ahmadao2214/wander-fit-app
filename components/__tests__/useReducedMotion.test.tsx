import { AccessibilityInfo } from 'react-native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import { primeReducedMotion, resetReducedMotionCache, useReducedMotion } from '../../hooks/useReducedMotion'

let listener: ((value: boolean) => void) | undefined
function mockSetting(value: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(value)
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, cb: (value: boolean) => void) => {
    listener = cb
    return { remove: jest.fn() }
  }) as typeof AccessibilityInfo.addEventListener)
}

beforeEach(() => {
  resetReducedMotionCache()
  listener = undefined
})
afterEach(() => jest.restoreAllMocks())

describe('useReducedMotion', () => {
  it('is unknown (null) on the first render when nothing has answered yet', async () => {
    mockSetting(false)
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBeNull()
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('knows the answer on the first render once the app has asked (regression)', async () => {
    // A later screen must not spend a tick at "unknown": DayTile and the
    // headlines use their first render to decide whether to play an entrance.
    mockSetting(false)
    primeReducedMotion()
    await act(async () => {})
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('a screen mounted after a change starts from the new answer', async () => {
    mockSetting(false)
    const first = renderHook(() => useReducedMotion())
    await waitFor(() => expect(first.result.current).toBe(false))
    act(() => listener?.(true))
    expect(first.result.current).toBe(true)

    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(() => {}))
    const second = renderHook(() => useReducedMotion())
    expect(second.result.current).toBe(true)
  })

  it('treats a platform that cannot answer as motion allowed', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockRejectedValue(new Error('unsupported'))
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never)
    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(false))
  })
})
