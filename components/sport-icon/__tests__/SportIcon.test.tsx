import React from 'react'
import { AccessibilityInfo } from 'react-native'
import { render, screen, waitFor, act } from '@testing-library/react-native'
import { TamaguiProvider } from 'tamagui'
import config from '../../../tamagui.config'
import { SportIcon } from '../SportIcon'

const mockLottieProps: jest.Mock = jest.fn()
jest.mock('lottie-react-native', () => {
  const { View } = jest.requireActual('react-native')
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      mockLottieProps(props)
      return <View testID="lottie" />
    },
  }
})

const Providers = ({ children }: { children: React.ReactNode }) => (
  <TamaguiProvider config={config}>{children}</TamaguiProvider>
)

let reduceMotionListener: ((value: boolean) => void) | undefined
function mockReduceMotion(value: boolean) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(value)
  jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation(((_event: string, listener: (value: boolean) => void) => {
    reduceMotionListener = listener
    return { remove: jest.fn() }
  }) as typeof AccessibilityInfo.addEventListener)
}

const lastLottie = () => mockLottieProps.mock.calls[mockLottieProps.mock.calls.length - 1][0]

beforeEach(() => {
  mockLottieProps.mockClear()
  reduceMotionListener = undefined
  mockReduceMotion(false)
})

afterEach(() => jest.restoreAllMocks())

describe('SportIcon', () => {
  it('shows the rest pose without playing by default', async () => {
    render(<SportIcon name="Soccer" />, { wrapper: Providers })
    await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled())
    expect(screen.getByTestId('lottie', { includeHiddenElements: true })).toBeTruthy()
    expect(lastLottie().autoPlay).toBe(false)
    expect(lastLottie().loop).toBe(false)
  })

  it('renders the Lottie at the icon size, not overscaled', () => {
    render(<SportIcon name="Soccer" size={44} />, { wrapper: Providers })
    expect(lastLottie().style).toEqual({ width: 44, height: 44 })
  })

  it('plays once and reports when it finishes', async () => {
    const onFinish = jest.fn()
    render(<SportIcon name="Soccer" mode="once" onFinish={onFinish} />, { wrapper: Providers })
    await waitFor(() => expect(lastLottie().autoPlay).toBe(true))
    expect(lastLottie().loop).toBe(false)
    expect(onFinish).not.toHaveBeenCalled()
    act(() => lastLottie().onAnimationFinish(false))
    expect(onFinish).toHaveBeenCalledTimes(1)
  })

  it('does not start moving before Reduce Motion is known', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(() => {}))
    render(<SportIcon name="Soccer" mode="loop" />, { wrapper: Providers })
    expect(lastLottie().autoPlay).toBe(false)
  })

  it('loops when asked', async () => {
    render(<SportIcon name="Soccer" mode="loop" />, { wrapper: Providers })
    await waitFor(() => expect(lastLottie().autoPlay).toBe(true))
    expect(lastLottie().loop).toBe(true)
  })

  describe('with Reduce Motion on', () => {
    beforeEach(() => mockReduceMotion(true))

    it('stays still in once mode and finishes right away', async () => {
      const onFinish = jest.fn()
      render(<SportIcon name="Soccer" mode="once" onFinish={onFinish} />, { wrapper: Providers })
      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
      expect(lastLottie().autoPlay).toBe(false)
    })

    it('stays still in loop mode', async () => {
      render(<SportIcon name="Soccer" mode="loop" />, { wrapper: Providers })
      await waitFor(() => expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled())
      expect(lastLottie().autoPlay).toBe(false)
    })
  })

  it('stops when Reduce Motion is switched on mid-loop', async () => {
    render(<SportIcon name="Soccer" mode="loop" />, { wrapper: Providers })
    await waitFor(() => expect(lastLottie().autoPlay).toBe(true))
    act(() => reduceMotionListener?.(true))
    expect(lastLottie().autoPlay).toBe(false)
  })

  describe('a sport without an animation', () => {
    it('shows the static icon instead of a Lottie', () => {
      render(<SportIcon name="Wrestling" testID="icon" />, { wrapper: Providers })
      expect(screen.queryByTestId('lottie', { includeHiddenElements: true })).toBeNull()
      expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeTruthy()
    })

    it('finishes a once play right away so the flow continues', async () => {
      const onFinish = jest.fn()
      render(<SportIcon name="Wrestling" mode="once" onFinish={onFinish} />, { wrapper: Providers })
      await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
    })
  })

  it('is hidden from screen readers, since the tile label names the sport', () => {
    render(<SportIcon name="Soccer" testID="icon" />, { wrapper: Providers })
    const icon = screen.getByTestId('icon', { includeHiddenElements: true })
    expect(icon.props.accessible).toBe(false)
    expect(icon.props.importantForAccessibility).toBe('no-hide-descendants')
  })
})
