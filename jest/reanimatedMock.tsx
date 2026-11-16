/**
 * A small stand-in for react-native-reanimated in screen tests (its native
 * worklets runtime doesn't load under Jest). Animations jump to their end
 * value, so a test sees each screen's settled frame.
 *
 *   jest.mock('react-native-reanimated', () => jest.requireActual('../../jest/reanimatedMock'))
 */
import { createElement, useRef, type ComponentType } from 'react'
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
export function useAnimatedProps<T>(fn: () => T): T {
  return fn()
}
export function useDerivedValue<T>(fn: () => T) {
  return { value: fn() }
}
export const withTiming = <T,>(to: T) => to
export const withDelay = <T,>(_ms: number, to: T) => to
export const withRepeat = <T,>(to: T) => to
export const withSequence = <T,>(...steps: T[]) => steps[steps.length - 1]
export const cancelAnimation = () => {}
export const interpolateColor = (_v: number, _i: number[], out: string[]) => out[out.length - 1]

// Animated props land on the component as plain props.
function createAnimatedComponent<P extends object>(C: ComponentType<P>) {
  return function AnimatedComponent({ animatedProps, ...rest }: P & { animatedProps?: Partial<P> }) {
    return createElement(C, { ...(rest as P), ...animatedProps })
  }
}
const Animated = { View, Text, createAnimatedComponent }
export default Animated
