import { AccessibilityInfo } from 'react-native'
import { act, renderHook, waitFor } from '@testing-library/react-native'
import {
  primeReducedMotion,
  resetReducedMotionCache,
  useReducedMotion,
} from '../../hooks/useReducedMotion'

let listener: ((value: boolean) => void) | undefined
/** Listeners still subscribed (removed ones drop out, like the real API). */
const live = new Set<(value: boolean) => void>()
const emit = (value: boolean) => live.forEach((cb) => cb(value))
function mockSetting(value: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(value)
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((
    _event: string,
    cb: (value: boolean) => void
  ) => {
    listener = cb
    live.add(cb)
    return { remove: () => live.delete(cb) }
  }) as typeof AccessibilityInfo.addEventListener)
}

beforeEach(() => {
  resetReducedMotionCache()
  listener = undefined
  live.clear()
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

  it('a change while no screen is mounted still reaches the next screen (regression)', async () => {
    mockSetting(false)
    primeReducedMotion()
    await act(async () => {})
    const first = renderHook(() => useReducedMotion())
    first.unmount()

    // The screen's own listener is gone; the app-level one must hear this
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(() => {}))
    act(() => emit(true))
    const next = renderHook(() => useReducedMotion())
    expect(next.result.current).toBe(true)
  })

  it('treats a platform that cannot answer as motion allowed', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockRejectedValue(new Error('unsupported'))
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() } as never)
    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(false))
  })
})
