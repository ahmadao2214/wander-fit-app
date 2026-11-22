import { AlertDialog, YStack, XStack, Text, Card, Button, ScrollView, Spinner } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Play,
  Target,
  CheckCircle,
  RotateCcw,
  Bell,
} from '@tamagui/lucide-icons'
import { todayHeading, phaseWeekSegments, progressCaption, countMainExercises } from '../../lib/today'
import { useCurrentDate } from '../../hooks/useCurrentDate'
import { workoutMetaLine } from '../../lib/workoutMeta'
import { DEFAULT_WEEKS_PER_PHASE } from '../../lib/calendarUtils'
import { pausedLabel } from '../../lib/sessionTiming'
import { PHASE_NAMES, phaseTokens } from '../../lib/phase'
import { analytics } from '../../lib/analytics'
import type { Phase } from '../../types'
import { Display, Title, Body, Supporting, Caption, numeric } from '../../components/Typography'
import { localDayArgs } from '../../lib/weeksOnPlan'

// ─────────────────────────────────────────────────────────────────────────────
// PHASE PROGRESS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * One segment per week of the current phase. Replaces the 0/0/0 stat grid:
 * it says where the athlete is before they've logged anything, and the
 * counts appear only once there is something to count.
 */
function PhaseProgress({
  phase,
  week,
  weeksPerPhase,
  caption,
}: {
  phase: Phase
  week: number
  weeksPerPhase: number
  caption: string | null
}) {
  const segments = phaseWeekSegments(week, weeksPerPhase)
  return (
    <YStack gap="$2.5" testID="phase-progress">
      {/* The full name wraps on narrow phones or large text; the week count keeps its width */}
      <XStack justify="space-between" items="flex-end" gap="$3">
        <Body fontWeight="600" style={{ flex: 1 }}>{PHASE_NAMES[phase]}</Body>
        <Supporting fontWeight="600" style={[numeric, { flexShrink: 0 }]}>
          Week {Math.min(week, segments.length)} of {segments.length}
        </Supporting>
      </XStack>
      {/* Done and current weeks are solid; the current one is taller, so it reads
          by shape instead of a faded fill that disappeared in dark mode */}
      <XStack gap="$1.5" items="center" accessibilityLabel={`Week ${week} of ${segments.length}`}>
        {segments.map((segment, index) => (
          <YStack
            key={index}
            testID={`week-segment-${segment}`}
            flex={1}
            height={segment === 'current' ? 10 : 6}
            rounded="$10"
            bg={segment === 'upcoming' ? '$color4' : phaseTokens(phase).fill}
          />
        ))}
      </XStack>
      {caption && (
        <Supporting color="$color10">{caption}</Supporting>
      )}
    </YStack>
  )
}


/**
 * Discard a paused workout. Exit only pauses, so ending a session for good
 * is its own choice, and it asks first.
 */
function DiscardPausedWorkout({ onDiscard }: { onDiscard: () => Promise<void> }) {
  const [open, setOpen] = useState(false)
  const [isDiscarding, setIsDiscarding] = useState(false)

  const handleDiscard = async () => {
    setIsDiscarding(true)
    try {
      await onDiscard()
      setOpen(false)
    } catch (error) {
      console.error('Failed to discard workout:', error)
    } finally {
      setIsDiscarding(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>
        <Button
          size="$3"
          chromeless
          self="center"
          color="$color11"
          fontFamily="$body"
          fontWeight="600"
          testID="today-discard"
        >
          Discard
        </Button>
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay key="overlay" opacity={0.5} />
        <AlertDialog.Content bg="$surface" elevate key="content" p="$5" mx="$4" rounded="$5">
          <YStack gap="$3">
            <AlertDialog.Title fontFamily="$body" fontWeight="700" fontSize={18} lineHeight={24}>
              Discard this workout?
            </AlertDialog.Title>
            <AlertDialog.Description fontFamily="$body" color="$color10">
              The sets you logged won't count. You can start this workout fresh any time.
            </AlertDialog.Description>
            <XStack gap="$3" pt="$2">
              <AlertDialog.Cancel asChild>
                <Button
                  flex={1}
                  bg="$background"
                  borderWidth={2}
                  borderColor="$borderColor"
                  fontFamily="$body"
                  fontWeight="700"
                  color="$color11"
                  rounded="$4"
                >
                  Keep it
                </Button>
              </AlertDialog.Cancel>
              <Button
                flex={1}
                bg="$red11"
                color="white"
                fontFamily="$body"
                fontWeight="700"
                rounded="$4"
                disabled={isDiscarding}
                onPress={handleDiscard}
                testID="today-discard-confirm"
              >
                {isDiscarding ? '…' : 'Discard'}
              </Button>
            </XStack>
          </YStack>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Athlete Dashboard - "Today" Tab
 * 
 * HYBRID MODEL:
 * - Shows the scheduled "next workout" prominently
 * - Quick access to start the workout
 * - Progress summary at a glance
 * 
 */
export default function AthleteDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const today = useCurrentDate()

  // Get current program state
  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : "skip"
  )

  // Get progress summary
  const progress = useQuery(
    api.userPrograms.getProgressSummary,
    user ? {} : "skip"
  )

  // Get today's workout (with override support)
  const todayWorkout = useQuery(
    api.scheduleOverrides.getTodayWorkout,
    // The athlete's day: a Today pick lasts until midnight, local time
    user ? localDayArgs(today) : "skip"
  )

  // Check for pending reassessment
  const reassessmentStatus = useQuery(
    api.userPrograms.getReassessmentStatus,
    user ? {} : "skip"
  )

  // Check for active GPP session (in-progress)
  const activeSession = useQuery(
    api.gppWorkoutSessions.getCurrentSession,
    user ? {} : "skip"
  )

  // Check for session on today's scheduled workout (any status)
  const todaySession = useQuery(
    api.gppWorkoutSessions.getSessionForTemplate,
    todayWorkout ? { templateId: todayWorkout._id } : "skip"
  )

  // Discard a paused session (the athlete's explicit choice; Exit only pauses)
  const abandonSession = useMutation(api.gppWorkoutSessions.abandonSession)

  // Phase colors: one brand hue, deepening GPP → SSP (lib/phase.ts)
  const phase = phaseTokens(programState?.phase)

  // Loading state
  if (authLoading || programState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primaryText" />
        <Text color="$color10" fontFamily="$body">
          Loading your program...
        </Text>
      </YStack>
    )
  }

  // Error state
  if (!user) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text fontFamily="$body">Error loading user data</Text>
        <SignOutButton />
      </YStack>
    )
  }

  // Onboarding state - user needs to complete intake
  if (!programState) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$5" px="$4">
        <YStack 
          bg="$brand2" 
          p="$4" 
          rounded="$10" 
          items="center" 
          justify="center"
        >
          <Target size={48} color="$primaryText" />
        </YStack>
        <YStack items="center" gap="$2">
          <Display text="center">Complete your setup</Display>
          <Text 
            color="$color10" 
            text="center" 
            fontFamily="$body"
            maxW={280}
          >
            Let's get you started with a personalized training program tailored to your sport.
          </Text>
        </YStack>
        <Button
          size="$5"
          bg="$primary"
          color="white"
          fontFamily="$body" fontWeight="700"
          pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
          onPress={() => router.replace('/')}
        >
          Get Started
        </Button>
      </YStack>
    )
  }

  // Determine workout state. A paused session comes first, whichever day it's
  // from: Today offers Resume (or Discard) rather than a fresh Start.
  const pausedSession = activeSession ?? null
  const pausedElsewhere = !!pausedSession && pausedSession.templateId !== todayWorkout?._id
  const isCompleted = !pausedSession && todaySession &&
    todaySession.status === 'completed' &&
    todayWorkout

  const cardWorkoutName = pausedElsewhere
    ? (pausedSession.templateSnapshot?.name ?? pausedSession.template?.name ?? 'Your workout')
    : todayWorkout?.name

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <YStack
          gap="$5"
          px="$4"
          pt={insets.top + 16}
          pb={insets.bottom + 100}
          maxW={800}
          width="100%"
          self="center"
        >
          {/* Header: the date, with the athlete's sport and category as a quiet label */}
          <YStack gap="$1" testID="today-heading">
            {programState.sportName && (
              <Supporting color="$color10" fontWeight="600">
                {programState.sportName}
                {programState.categoryShortName ? ` · ${programState.categoryShortName}` : ''}
              </Supporting>
            )}
            <Display>{todayHeading(today)}</Display>
          </YStack>

          {/* Reassessment Banner */}
          {reassessmentStatus?.reassessmentPending && (
            <Card
              bg="$brand1"
              p="$4"
              rounded="$4"
              borderLeftWidth={4}
              borderLeftColor="$primary"
              borderCurve="continuous"
            >
              <XStack items="center" gap="$3">
                <YStack
                  bg="$primary"
                  p="$2"
                  rounded="$10"
                >
                  <Bell color="white" size={20} />
                </YStack>
                <YStack flex={1}>
                  <Body fontWeight="600" color="$brand9">
                    Your {reassessmentStatus.pendingForPhase} block is over
                  </Body>
                  <Supporting color="$brand8">
                    Check in to choose what's next
                  </Supporting>
                </YStack>
                <Button
                  size="$3"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$3"
                  pressStyle={{ bg: '$primaryPress' }}
                  onPress={() => {
                    router.push('/(reassessment)/celebration' as any)
                  }}
                >
                  Check in
                </Button>
              </XStack>
            </Card>
          )}

          {/* Today's Workout Card */}
          <Card
            testID="today-workout-card"
            bg={isCompleted ? '$surface' : '$brand1'}
            borderWidth={isCompleted ? 1 : 0}
            borderColor="$borderColor"
            p="$5"
            rounded="$5"
          >
            <YStack gap="$4">
              <YStack gap="$1.5">
                <XStack justify="space-between" items="center">
                  {/* $color11 for a little more weight on the card's $brand1 tint */}
                  <Supporting color="$color11" fontWeight="600">
                    {pausedElsewhere ? 'Paused workout' : "Today's workout"}
                  </Supporting>
                  {isCompleted && (
                    <XStack items="center" gap="$1">
                      <CheckCircle size={14} color="$green10" />
                      <Caption color="$green11" fontWeight="600">
                        Done
                      </Caption>
                    </XStack>
                  )}
                </XStack>
                <Title>{cardWorkoutName || 'Loading…'}</Title>
                {todayWorkout && !pausedElsewhere && (
                  <Supporting testID="today-workout-meta">
                    <Supporting fontWeight="600" color={phase.text}>
                      {/* The athlete's scheduled position. todayWorkout.week is the template's
                          lookup week, which differs when phases are shorter than 4 weeks. */}
                      {programState.phase} W{programState.week} D{programState.day}
                    </Supporting>
                    {' · '}
                    {workoutMetaLine({
                      minutes: todayWorkout.estimatedDurationMinutes,
                      exerciseCount: countMainExercises(todayWorkout.exercises),
                    })}
                  </Supporting>
                )}
                {pausedSession && (
                  <Supporting testID="today-paused">
                    {pausedLabel(pausedSession.pausedAt ?? pausedSession.startedAt, today)} · your sets are saved
                  </Supporting>
                )}
              </YStack>

              {/* Action Button */}
              {isCompleted ? (
                <Button
                  size="$5"
                  variant="outlined"
                  borderColor="$borderColor"
                  borderWidth={2}
                  icon={CheckCircle}
                  fontFamily="$body" fontWeight="700"
                  color="$color11"
                  rounded="$4"
                  onPress={() => {
                    if (todayWorkout) {
                      router.push(`/(athlete)/workout/${todayWorkout._id}`)
                    }
                  }}
                >
                  View Workout
                </Button>
              ) : pausedSession ? (
                <YStack gap="$1">
                  <Button
                    size="$5"
                    bg="$primary"
                    color="white"
                    icon={RotateCcw}
                    fontSize={18}
                    fontFamily="$body" fontWeight="700"
                    rounded="$4"
                    pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
                    onPress={() => {
                      router.push({
                        pathname: '/(athlete)/workout/execute/[id]',
                        params: { id: pausedSession._id },
                      })
                    }}
                  >
                    Resume Workout
                  </Button>
                  <DiscardPausedWorkout
                    onDiscard={async () => {
                      await abandonSession({ sessionId: pausedSession._id })
                      analytics.trackWorkoutAbandoned({
                        phase: pausedSession.templateSnapshot?.phase,
                        week: pausedSession.templateSnapshot?.week,
                        day: pausedSession.templateSnapshot?.day,
                      })
                    }}
                  />
                </YStack>
              ) : (
                <Button
                  size="$5"
                  bg="$primary"
                  color="white"
                  icon={Play}
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
                  onPress={() => {
                    if (todayWorkout) {
                      router.push(`/(athlete)/workout/${todayWorkout._id}`)
                    }
                  }}
                  disabled={!todayWorkout}
                >
                  Start Workout
                </Button>
              )}
            </YStack>
          </Card>

          {/* Where the athlete is in the current phase */}
          <PhaseProgress
            phase={programState.phase}
            week={programState.week}
            weeksPerPhase={programState.weeksPerPhase ?? DEFAULT_WEEKS_PER_PHASE}
            caption={
              progress
                ? progressCaption({ workoutsCompleted: progress.daysCompleted })
                : null
            }
          />

        </YStack>
      </ScrollView>
    </YStack>
  )
}
