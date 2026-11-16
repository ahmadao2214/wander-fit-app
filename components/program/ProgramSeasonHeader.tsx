import { useEffect } from 'react'
import { Pressable, View } from 'react-native'
import { useQuery } from 'convex/react'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated'
import { Text, YStack } from 'tamagui'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Display, Supporting } from '../Typography'
import { StoryPhaseBar } from '../first-run/StoryPhaseBar'
import { bandHeight } from '../first-run/PlanView'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { workoutShortName } from '../../lib/firstRunStory'
import { PHASES } from '../../lib/phase'
import type { Phase } from '../../types'

/** Where "You are here" sits along the bar, 0 → 1, mid-week. */
export function seasonPosition(phase: Phase, week: number, weeksPerPhase: number): number {
  const i = Math.max(0, PHASES.indexOf(phase))
  const w = Math.min(Math.max(1, week), weeksPerPhase)
  return (i * weeksPerPhase + w - 0.5) / (PHASES.length * weeksPerPhase)
}

/** "Up next · Tomorrow", or just "Up next" when the day isn't known. */
export function upNextLabel(next?: string): string {
  return next ? `Up next · ${next}` : 'Up next'
}

/**
 * The top of the Program tab: the season as the reveal's phase bar, today
 * marked, and an Up next card for the next workout. On the first visit after
 * saving (`welcome`), the header is as tall as the reveal's band, so the bar
 * sits exactly where it was and appears to stay still, and the card's edge
 * pulses once. Nothing starts by itself.
 */
export function ProgramSeasonHeader({ welcome, kept, next }: { welcome: boolean; kept: boolean; next?: string }) {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const reduced = useReducedMotion()
  const state = useQuery(api.userPrograms.getCurrentProgramState, {})
  const upNext = useQuery(api.scheduleOverrides.getTodayWorkout, {})
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (!welcome || reduced !== false || !upNext) return
    pulse.value = withDelay(500, withSequence(withTiming(1, { duration: 420 }), withTiming(0, { duration: 980 })))
  }, [welcome, reduced, upNext, pulse])
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))

  if (!state) return null
  const weeksPerPhase = state.weeksPerPhase ?? 4
  const totalWeeks = weeksPerPhase * PHASES.length
  const at = seasonPosition(state.phase as Phase, state.week, weeksPerPhase)

  return (
    <YStack px="$5" testID="program-season-header">
      <YStack height={welcome ? bandHeight(insets.top) - insets.top - 16 : undefined} justify="flex-end" pb="$1">
        <Display accessibilityRole="header">Program</Display>
        <Supporting>
          {[state.sportName, `${totalWeeks} weeks`].filter(Boolean).join(' · ')}
        </Supporting>
      </YStack>
      <View style={{ marginTop: 16 }}>
        <StoryPhaseBar weeksPerPhase={weeksPerPhase} ranges />
        <View style={{ height: 20, marginTop: 4 }}>
          <Text
            position="absolute"
            l={`${Math.round(at * 100)}%`}
            ml={-6}
            fontFamily="$body"
            fontSize={12}
            fontWeight="700"
            color="$primaryText"
            testID="program-you-are-here"
          >
            ▲ You are here
          </Text>
        </View>
      </View>

      {kept ? (
        <Supporting mt="$2" testID="program-kept">
          You already had a plan on this account, so we kept it and its history.
        </Supporting>
      ) : null}

      {upNext ? (
        <Pressable
          onPress={() => router.push(`/(athlete)/workout/${upNext._id as Id<'program_templates'>}`)}
          accessibilityRole="button"
          accessibilityLabel={`${upNextLabel(next)}. ${upNext.name}, day ${upNext.day}, about ${upNext.estimatedDurationMinutes} minutes`}
          testID="program-up-next"
          style={({ pressed }) => ({ marginTop: 12, transform: [{ scale: pressed ? 0.98 : 1 }] })}
        >
          <YStack bg="$surface" rounded="$5" p="$4" gap="$1" borderWidth={1} borderColor="$borderColor">
            <Text fontFamily="$body" fontSize={12} fontWeight="700" color="$primaryText">
              {upNextLabel(next)}
            </Text>
            <Display fontSize={30} lineHeight={32}>
              {workoutShortName(upNext.name)}
            </Display>
            <Supporting>
              Day {upNext.day} · About {upNext.estimatedDurationMinutes} min · Tap to see the workout
            </Supporting>
            <Animated.View
              pointerEvents="none"
              style={[
                { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 18, borderWidth: 2, borderColor: '#2563EB' },
                pulseStyle,
              ]}
            />
          </YStack>
        </Pressable>
      ) : null}
    </YStack>
  )
}
