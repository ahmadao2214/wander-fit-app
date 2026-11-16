import { useEffect } from 'react'
import { Pressable, Text as RNText, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated'
import { NIGHT_PHASE_FILL, STORY_PHASES } from '../../lib/firstRunStory'
import type { Phase } from '../../types'
import { BODY_BOLD, DISPLAY } from './Night'
import { PAGE_EASE } from './intakeMotion'

export const PHASE_BAR_HEIGHT = 60

/** "GPP · 4 wk", or with ranges "GPP · Wk 1–4". */
export function phaseDetail(phase: Phase, index: number, weeksPerPhase: number, ranges: boolean): string {
  if (!ranges) return `${phase} · ${weeksPerPhase} wk`
  const from = index * weeksPerPhase + 1
  const to = (index + 1) * weeksPerPhase
  return `${phase} · Wk ${from}–${to}`
}

function Segment({
  phase,
  label,
  detail,
  selected,
  onPress,
  draw,
  at,
  first,
  last,
}: {
  phase: Phase
  label: string
  detail: string
  selected: boolean
  onPress?: () => void
  draw: boolean
  at: number
  first: boolean
  last: boolean
}) {
  const k = useSharedValue(draw ? 0 : 1)
  useEffect(() => {
    k.value = draw ? withDelay(at, withTiming(1, { duration: 300, easing: PAGE_EASE })) : 1
  }, [draw, at, k])
  // Draws from the left edge: transform only, so nothing reflows.
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: k.value }] }))
  const body = (
    <Animated.View
      style={[
        {
          flex: 1,
          backgroundColor: NIGHT_PHASE_FILL[phase],
          paddingHorizontal: 8,
          paddingVertical: 8,
          justifyContent: 'space-between',
          borderTopLeftRadius: first ? 8 : 4,
          borderBottomLeftRadius: first ? 8 : 4,
          borderTopRightRadius: last ? 8 : 4,
          borderBottomRightRadius: last ? 8 : 4,
          borderBottomWidth: selected ? 3 : 0,
          borderBottomColor: '#FFFFFF',
          transformOrigin: 'left',
        },
        style,
      ]}
    >
      <RNText numberOfLines={2} style={{ fontFamily: DISPLAY, fontSize: 17, lineHeight: 17, color: '#FFFFFF', letterSpacing: 0.6 }}>
        {label}
      </RNText>
      <RNText style={{ fontFamily: BODY_BOLD, fontSize: 12, color: '#FFFFFF', opacity: 0.9 }}>{detail}</RNText>
    </Animated.View>
  )
  if (!onPress) return <View style={{ flex: 1 }} accessible accessibilityLabel={`${label}, ${detail}`}>{body}</View>
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${detail}`}
      testID={`phase-${phase}`}
      style={{ flex: 1 }}
    >
      {body}
    </Pressable>
  )
}

/**
 * The season as three phases in plain English, the acronym small: Build the
 * base, Train for your sport, Sharpen for the season. The reveal and the
 * Program tab draw it at the same size, so it reads as one bar that stays.
 */
export function StoryPhaseBar({
  weeksPerPhase,
  selected,
  onSelect,
  draw = false,
  drawAt = 0,
  drawGap = 520,
  ranges = false,
}: {
  weeksPerPhase: number
  selected?: Phase | null
  onSelect?: (phase: Phase) => void
  draw?: boolean
  drawAt?: number
  drawGap?: number
  ranges?: boolean
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, height: PHASE_BAR_HEIGHT }} testID="phase-bar">
      {STORY_PHASES.map((p, i) => (
        <Segment
          key={p.phase}
          phase={p.phase}
          label={p.label}
          detail={phaseDetail(p.phase, i, weeksPerPhase, ranges)}
          selected={selected === p.phase}
          onPress={onSelect ? () => onSelect(p.phase) : undefined}
          draw={draw}
          at={drawAt + i * drawGap}
          first={i === 0}
          last={i === STORY_PHASES.length - 1}
        />
      ))}
    </View>
  )
}
