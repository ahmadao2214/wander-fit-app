import React, { useEffect, useState } from 'react'
import {
  Pressable,
  Text as RNText,
  View,
  useWindowDimensions,
  type TextStyle,
  type ViewStyle,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import LottieView from 'lottie-react-native'
import { getSportAnimation } from '../../lib/sportAnimations'
import { NIGHT } from '../../lib/firstRunStory'
import { PAGE_EASE } from './intakeMotion'
import { SportField } from './SportField'

/**
 * Game-night building blocks shared by every First Run screen: the huge
 * headline with its clip-mask wipe, the primary button, the small tracked
 * label, and the drifting sport shapes behind the promise and the questions.
 */

export const DISPLAY = 'BebasNeue'
export const BODY = 'PlusJakartaSans'
export const BODY_BOLD = 'PlusJakartaSansBold'
export const BODY_SEMI = 'PlusJakartaSansSemiBold'

/** Headline size for a screen, shrunk on narrow phones so it fills the width without clipping. */
export function headlineSize(base: number, width: number): number {
  return Math.round(Math.min(base, (base * Math.min(width, 430)) / 390))
}

/**
 * The question title, set huge in Bebas Neue. It wipes up from a clip mask
 * (320 ms, 60 ms behind the page turn). Only the title animates.
 */
export function Headline({
  children,
  size,
  moving,
  align = 'left',
  testID,
}: {
  children: string
  size: number
  moving: boolean
  align?: 'left' | 'center'
  testID?: string
}) {
  const [height, setHeight] = useState(0)
  const y = useSharedValue(moving ? 1 : 0)
  useEffect(() => {
    if (!moving) {
      y.value = 0
      return
    }
    if (height > 0) y.value = withDelay(60, withTiming(0, { duration: 320, easing: PAGE_EASE }))
  }, [height, moving, y])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value * height * 1.05 }],
    opacity: height === 0 && y.value > 0 ? 0 : 1,
  }))
  return (
    <View style={{ overflow: 'hidden' }}>
      <Animated.View style={style} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        <RNText
          accessibilityRole="header"
          testID={testID}
          style={{
            fontFamily: DISPLAY,
            fontSize: size,
            lineHeight: Math.round(size * 0.92),
            paddingTop: Math.round(size * 0.08),
            color: NIGHT.fg,
            textAlign: align,
          }}
        >
          {children.toUpperCase()}
        </RNText>
      </Animated.View>
    </View>
  )
}

/** Small tracked label: "POPULAR", "AGE GROUP". */
export function Label({ children, style }: { children: string; style?: TextStyle }) {
  return (
    <RNText
      style={[{ fontFamily: BODY_BOLD, fontSize: 12, letterSpacing: 1.6, color: NIGHT.fg2 }, style]}
    >
      {children.toUpperCase()}
    </RNText>
  )
}

/** The one primary action: 56pt, full width, pressed to 0.97. */
export function NightButton({
  label,
  onPress,
  disabled = false,
  testID,
  style,
}: {
  label: string
  onPress: () => void
  disabled?: boolean
  testID?: string
  style?: ViewStyle
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      aria-disabled={disabled}
      testID={testID}
      style={({ pressed }) => [
        {
          height: 56,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: disabled ? NIGHT.line : pressed ? NIGHT.actionPress : NIGHT.action,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <RNText
        style={{ fontFamily: BODY_BOLD, fontSize: 17, color: disabled ? NIGHT.fg2 : '#FFFFFF' }}
      >
        {label}
      </RNText>
    </Pressable>
  )
}

/** A still or playing sport Lottie with no circle around it. */
export function SportShape({
  name,
  size,
  play = false,
  playKey,
  speed = 1,
}: {
  name: string
  size: number
  play?: boolean
  /** Change it to play again. */
  playKey?: string | number
  speed?: number
}) {
  const source = getSportAnimation(name)
  if (!source) return <View style={{ width: size, height: size }} />
  return (
    <LottieView
      key={play ? `play-${playKey ?? ''}` : 'still'}
      source={source}
      autoPlay={play}
      loop={false}
      speed={speed}
      style={{ width: size, height: size }}
    />
  )
}

/**
 * Your sport becomes the world: from the Season screen on, the picked sport's
 * field sits large, cropped and faint in the corner, in chalk lines, and
 * drifts slowly. With `fly` it arrives from the tile, growing in as the page
 * turns.
 */
export function SportBackdrop({
  name,
  moving,
  fly = false,
}: {
  name: string
  moving: boolean
  fly?: boolean
}) {
  const enter = useSharedValue(fly && moving ? 0 : 1)
  const sway = useSharedValue(0)
  useEffect(() => {
    if (!moving) {
      enter.value = 1
      sway.value = 0
      return
    }
    enter.value = withTiming(1, { duration: 620, easing: PAGE_EASE })
    sway.value = withRepeat(
      withTiming(1, { duration: 14000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    )
  }, [moving, enter, sway])
  const style = useAnimatedStyle(() => ({
    opacity: 1 - enter.value * 0.9,
    transform: [
      { translateX: -22 * sway.value - (1 - enter.value) * 260 },
      { translateY: -14 * sway.value - (1 - enter.value) * 300 },
      { scale: 0.18 + enter.value * 0.82 },
    ],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ position: 'absolute', width: 560, height: 560, right: -190, bottom: 70 }, style]}
      testID="sport-backdrop"
    >
      <SportField name={name} size={560} color={NIGHT.fg} />
    </Animated.View>
  )
}

function DriftShape({
  name,
  top,
  delay,
  seconds,
  moving,
}: {
  name: string
  top: number
  delay: number
  seconds: number
  moving: boolean
}) {
  const { width } = useWindowDimensions()
  const x = useSharedValue(moving ? 0 : 0.45)
  useEffect(() => {
    if (!moving) {
      x.value = 0.45
      return
    }
    // Start part-way across so the screen is never empty, then loop.
    const start = (delay % seconds) / seconds
    x.value = start
    x.value = withTiming(
      1,
      { duration: (1 - start) * seconds * 1000, easing: Easing.linear },
      (done) => {
        if (!done) return
        x.value = 0
        x.value = withRepeat(
          withTiming(1, { duration: seconds * 1000, easing: Easing.linear }),
          -1,
          false
        )
      }
    )
  }, [moving, delay, seconds, x])
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -280 + x.value * (width + 300) }],
  }))
  return (
    <Animated.View
      style={[
        { position: 'absolute', top, left: 0, width: 240, height: 240, opacity: 0.14 },
        style,
      ]}
    >
      <SportShape name={name} size={240} />
    </Animated.View>
  )
}

/** Five sport icons crossing slowly behind the promise, 18–30 s each. */
export function PromiseDrift({
  sports,
  moving,
}: {
  sports: readonly { name: string; top: number; delay: number; seconds: number }[]
  moving: boolean
}) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      testID="promise-drift"
    >
      {sports.map((s) => (
        <DriftShape key={s.name} {...s} moving={moving} />
      ))}
    </View>
  )
}
