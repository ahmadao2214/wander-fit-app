import { useEffect } from 'react'
import { Pressable, View, useWindowDimensions } from 'react-native'
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

/**
 * Where the "You are here" label sits. Its arrow always points at the week;
 * past 60% of the bar the arrow goes on the text's right end, so the label
 * reads leftward and stays on screen.
 */
export function youAreHere(at: number): { side: 'left' | 'right'; offset: `${number}%`; text: string } {
  if (at <= 0.6) return { side: 'left', offset: `${Math.round(at * 100)}%`, text: '▲ You are here' }
  return { side: 'right', offset: `${Math.round((1 - at) * 100)}%`, text: 'You are here ▲' }
}

/** "Up next · Tomorrow", or just "Up next" when the day isn't known. */
export function upNextLabel(next?: string): string {
  return next ? `Up next · ${next}` : 'Up next'
}

/** The shortest screen with room for the band-tall welcome header and both calendar rows. */
export const WELCOME_TALL_MIN_HEIGHT = 800

/**
 * How tall the header's title block is. On the welcome visit it matches the
 * reveal's band, so the phase bar stays put, but only on a phone tall enough
 * to keep the calendar below it whole (its week pages don't scroll
 * vertically). Otherwise it sizes to its content.
 */
export function welcomeTitleHeight(welcome: boolean, windowHeight: number, insetTop: number): number | undefined {
  if (!welcome || windowHeight < WELCOME_TALL_MIN_HEIGHT) return undefined
  return bandHeight(insetTop) - insetTop - 16
}

/** Up next is only for a workout still to do: today's pick can be one already finished. */
export function isUpNext(workout: unknown, session: { status: string } | null | undefined): boolean {
  return !!workout && session !== undefined && session?.status !== 'completed'
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
  const upNextSession = useQuery(
    api.gppWorkoutSessions.getSessionForTemplate,
    upNext ? { templateId: upNext._id } : 'skip'
  )
  const showUpNext = isUpNext(upNext, upNextSession)
  const { height: windowHeight } = useWindowDimensions()
  const pulse = useSharedValue(0)

  useEffect(() => {
    if (!welcome || reduced !== false || !showUpNext) return
    pulse.value = withDelay(500, withSequence(withTiming(1, { duration: 420 }), withTiming(0, { duration: 980 })))
  }, [welcome, reduced, showUpNext, pulse])
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }))

  if (!state) return null
  const weeksPerPhase = state.weeksPerPhase ?? 4
  const totalWeeks = weeksPerPhase * PHASES.length
  const at = seasonPosition(state.phase as Phase, state.week, weeksPerPhase)
  const here = youAreHere(at)

  return (
    <YStack px="$5" testID="program-season-header">
      <YStack height={welcomeTitleHeight(welcome, windowHeight, insets.top)} justify="flex-end" pb="$1">
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
            style={here.side === 'left' ? { left: here.offset, marginLeft: -6 } : { right: here.offset, marginRight: -6 }}
            fontFamily="$body"
            fontSize={12}
            fontWeight="700"
            color="$primaryText"
            testID="program-you-are-here"
          >
            {here.text}
          </Text>
        </View>
      </View>

      {kept ? (
        <Supporting mt="$2" testID="program-kept">
          You already had a plan on this account, so we kept it and its history.
        </Supporting>
      ) : null}

      {upNext && showUpNext ? (
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
