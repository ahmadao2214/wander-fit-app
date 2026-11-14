import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled, type ColorTokens } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Play,
  Target,
  CheckCircle,
  RotateCcw,
  Bell,
} from '@tamagui/lucide-icons'
import { todayHeading, phaseWeekSegments, progressCaption, countMainExercises } from '../../lib/today'
import { workoutMetaLine } from '../../lib/workoutMeta'
import { DEFAULT_WEEKS_PER_PHASE } from '../../lib/calendarUtils'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

// Display heading using Bebas Neue
const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 32,
  letterSpacing: 1,
  color: '$color12',
})

// Section label
const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

const PHASE_NAMES: Record<string, string> = {
  GPP: 'General prep',
  SPP: 'Specific prep',
  SSP: 'Sport-specific prep',
}

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
  phaseColor,
  caption,
}: {
  phase: string
  week: number
  weeksPerPhase: number
  phaseColor: ColorTokens
  caption: string | null
}) {
  const segments = phaseWeekSegments(week, weeksPerPhase)
  return (
    <YStack gap="$2.5" testID="phase-progress">
      <XStack justify="space-between" items="baseline">
        <SectionLabel>{PHASE_NAMES[phase] ?? phase}</SectionLabel>
        <Text fontSize={13} fontFamily="$body" fontWeight="600" color="$color11">
          Week {Math.min(week, segments.length)} of {segments.length}
        </Text>
      </XStack>
      <XStack gap="$1.5" accessibilityLabel={`Week ${week} of ${segments.length}`}>
        {segments.map((segment, index) => (
          <YStack
            key={index}
            flex={1}
            height={6}
            rounded="$10"
            bg={segment === 'upcoming' ? '$color4' : phaseColor}
            opacity={segment === 'current' ? 0.45 : 1}
          />
        ))}
      </XStack>
      {caption && (
        <Text fontSize={13} fontFamily="$body" color="$color10">
          {caption}
        </Text>
      )}
    </YStack>
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
    user ? {} : "skip"
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

  // Start session mutation
  const startSession = useMutation(api.gppWorkoutSessions.startSession)

  // Phase color (GPP=blue, SPP=orange, SSP=green)
  const phaseColor: ColorTokens = programState?.phase === 'GPP'
    ? '$blue9'
    : programState?.phase === 'SPP'
      ? '$orange9'
      : '$green9'

  // Loading state
  if (authLoading || programState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
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
          <Target size={48} color="$primary" />
        </YStack>
        <YStack items="center" gap="$2">
          <DisplayHeading>COMPLETE YOUR SETUP</DisplayHeading>
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
          pressStyle={{ opacity: 0.9, scale: 0.98 }}
          onPress={() => router.push('/(intake)/sport')}
        >
          Get Started
        </Button>
      </YStack>
    )
  }

  // Determine workout state
  const isInProgress = todaySession && 
    todaySession.status === 'in_progress' && 
    todayWorkout
  
  const isCompleted = todaySession && 
    todaySession.status === 'completed' &&
    todayWorkout

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
              <SectionLabel>
                {programState.sportName}
                {programState.categoryShortName ? ` · ${programState.categoryShortName}` : ''}
              </SectionLabel>
            )}
            <DisplayHeading>{todayHeading(new Date())}</DisplayHeading>
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
                  <Text fontFamily="$body" fontWeight="600" color="$brand9">
                    Phase Assessment Ready
                  </Text>
                  <Text fontSize={13} color="$brand8" fontFamily="$body">
                    Complete your check-in to unlock {reassessmentStatus.nextPhase}
                  </Text>
                </YStack>
                <Button
                  size="$3"
                  bg="$primary"
                  color="white"
                  fontFamily="$body" fontWeight="700"
                  rounded="$3"
                  pressStyle={{ opacity: 0.9 }}
                  onPress={() => {
                    router.push('/(reassessment)/celebration' as any)
                  }}
                >
                  Start Now
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
            elevation={isCompleted ? 0 : 3}
            shadowColor="$primary"
            shadowOpacity={isCompleted ? 0 : 0.1}
            shadowRadius={20}
          >
            <YStack gap="$4">
              <YStack gap="$1.5">
                <XStack justify="space-between" items="center">
                  <SectionLabel>Today's workout</SectionLabel>
                  {isCompleted && (
                    <XStack items="center" gap="$1">
                      <CheckCircle size={14} color="$success" />
                      <Text fontSize={12} color="$success" fontFamily="$body" fontWeight="600">
                        Done
                      </Text>
                    </XStack>
                  )}
                </XStack>
                <Text
                  fontSize={24}
                  fontFamily="$body" fontWeight="700"
                  color="$color12"
                  lineHeight={30}
                >
                  {todayWorkout?.name || 'Loading…'}
                </Text>
                {todayWorkout && (
                  <Text testID="today-workout-meta" fontSize={14} color="$color10" fontFamily="$body">
                    <Text fontSize={14} fontFamily="$body" fontWeight="600" color={phaseColor}>
                      {todayWorkout.phase ?? programState.phase} W{todayWorkout.week ?? programState.week} D{todayWorkout.day ?? programState.day}
                    </Text>
                    {' · '}
                    {workoutMetaLine({
                      minutes: todayWorkout.estimatedDurationMinutes,
                      exerciseCount: countMainExercises(todayWorkout.exercises),
                    })}
                  </Text>
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
              ) : isInProgress ? (
                <Button
                  size="$5"
                  bg={phaseColor}
                  color="white"
                  icon={RotateCcw}
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
                  onPress={() => {
                    router.push({
                      pathname: '/(athlete)/workout/execute/[id]',
                      params: { id: todaySession._id },
                    })
                  }}
                >
                  Resume Workout
                </Button>
              ) : (
                <Button
                  size="$5"
                  bg="$primary"
                  color="white"
                  icon={Play}
                  fontFamily="$body" fontWeight="700"
                  rounded="$4"
                  pressStyle={{ opacity: 0.9, scale: 0.98 }}
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
            phaseColor={phaseColor}
            caption={
              progress
                ? progressCaption({
                    workoutsCompleted: progress.daysCompleted,
                    currentStreak: progress.currentStreak,
                  })
                : null
            }
          />

        </YStack>
      </ScrollView>
    </YStack>
  )
}
