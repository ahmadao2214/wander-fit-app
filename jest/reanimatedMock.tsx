/**
 * A small stand-in for react-native-reanimated in screen tests (its native
 * worklets runtime doesn't load under Jest). Animations jump to their end
 * value, so a test sees each screen's settled frame.
 *
 *   jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
 */
import { useRef } from 'react'
import { Text, View } from 'react-native'

const identity = (t: number) => t
const easingFn = () => identity
export const Easing = {
  linear: identity,
  sin: identity,
  quad: identity,
  in: easingFn,
  out: easingFn,
  inOut: easingFn,
  bezier: () => ({ factory: () => identity }),
}

export function useSharedValue<T>(initial: T) {
  return useRef({ value: initial }).current
}
export function useAnimatedStyle<T>(fn: () => T): T {
  return fn()
}
export const withTiming = <T,>(to: T) => to
export const withDelay = <T,>(_ms: number, to: T) => to
export const withRepeat = <T,>(to: T) => to
export const withSequence = <T,>(...steps: T[]) => steps[steps.length - 1]
export const cancelAnimation = () => {}
export const interpolateColor = (_v: number, _i: number[], out: string[]) => out[out.length - 1]

const Animated = { View, Text, createAnimatedComponent: <C,>(c: C) => c }
export default Animated
