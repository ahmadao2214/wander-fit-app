import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  Play,
  Clock,
  Dumbbell,
  Timer,
  Target,
  Flame,
  CheckCircle,
  RotateCcw,
  Zap,
} from '@tamagui/lucide-icons'

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

// Stat number
const StatNumber = styled(Text, {
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: 28,
  color: '$primary',
})

// ─────────────────────────────────────────────────────────────────────────────
// INTENSITY BADGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface IntensityBadgeProps {
  intensity?: 'low' | 'medium' | 'high'
}

function IntensityBadge({ intensity = 'medium' }: IntensityBadgeProps) {
  const configs = {
    low: { bg: '$intensityLow6' as const, label: 'LOW', icon: Zap },
    medium: { bg: '$intensityMed6' as const, label: 'MODERATE', icon: Zap },
    high: { bg: '$intensityHigh6' as const, label: 'HIGH', icon: Flame },
  }
  const config = configs[intensity]

  return (
    <XStack 
      bg={config.bg} 
      px="$2" 
      py="$1" 
      rounded="$2" 
      items="center" 
      gap="$1"
    >
      <config.icon size={12} color="white" />
      <Text color="white" fontSize={10} fontFamily="$body" fontWeight="700" letterSpacing={0.5}>
        {config.label}
      </Text>
    </XStack>
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
 * Design: Strava-inspired with Electric Blue primary and Flame Orange accents
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
          {/* Header */}
          <YStack gap="$1">
            <Text
              color="$color10"
              fontSize={14}
              fontFamily="$body"
            >
              Welcome back, {user.name?.split(' ')[0] || 'Athlete'}
            </Text>
            <DisplayHeading>READY TO TRAIN?</DisplayHeading>
            {/* Sport and Training Focus */}
            {programState.sportName && (
              <XStack items="center" gap="$2" pt="$1">
                <Text
                  fontSize={13}
                  color="$color10"
                  fontFamily="$body"
                >
                  {programState.sportName}
                  {programState.categoryShortName && ` • ${programState.categoryShortName}`}
                </Text>
              </XStack>
            )}
          </YStack>

          {/* Active Session Alert */}
          {activeSession && activeSession.status === 'in_progress' && (
            <Card 
              bg="$accent2" 
              p="$4" 
              rounded="$4"
              borderLeftWidth={4}
              borderLeftColor="$accent"
            >
              <XStack items="center" gap="$3">
                <YStack 
                  bg="$accent" 
                  p="$2" 
                  rounded="$10"
                >
                  <Clock color="white" size={20} />
                </YStack>
                <YStack flex={1}>
                  <Text fontFamily="$body" fontWeight="600" color="$accent7">
                    Workout in Progress
                  </Text>
                  <Text fontSize={13} color="$accent6" fontFamily="$body">
                    {activeSession.template?.name || 'Pick up where you left off'}
                  </Text>
                </YStack>
                <Button
                  size="$3"
                  bg="$accent"
                  color="white"
                  icon={RotateCcw}
                  fontFamily="$body" fontWeight="700"
                  rounded="$3"
                  pressStyle={{ opacity: 0.9 }}
                  onPress={() => {
                    router.push({
                      pathname: '/(athlete)/workout/execute/[id]',
                      params: { id: activeSession._id },
                    })
                  }}
                >
                  Resume
                </Button>
              </XStack>
            </Card>
          )}

          {/* Today's Workout Card */}
          <Card
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
              {/* Top row: Phase badge + Duration */}
              <XStack justify="space-between" items="center">
                <XStack items="center" gap="$2">
                  <Card 
                    bg={isCompleted ? '$color6' : '$primary'} 
                    px="$3" 
                    py="$1.5" 
                    rounded="$3"
                  >
                    <Text 
                      color="white" 
                      fontSize={11} 
                      fontFamily="$body" fontWeight="700"
                      letterSpacing={0.5}
                    >
                      {programState.phase} W{programState.week}D{programState.day}
                    </Text>
                  </Card>
                  {isCompleted && (
                    <XStack items="center" gap="$1">
                      <CheckCircle size={16} color="$success" />
                      <Text fontSize={12} color="$success" fontFamily="$body" fontWeight="600">
                        Done
                      </Text>
                    </XStack>
                  )}
                </XStack>
                {todayWorkout && !isCompleted && (
                  <XStack items="center" gap="$1.5" opacity={0.7}>
                    <Timer size={14} color="$color10" />
                    <Text fontSize={13} color="$color10" fontFamily="$body">
                      ~{todayWorkout.estimatedDurationMinutes} min
                    </Text>
                  </XStack>
                )}
              </XStack>

              {/* Workout Title */}
              <YStack gap="$1">
                <SectionLabel>TODAY'S WORKOUT</SectionLabel>
                <Text 
                  fontSize={22} 
                  fontFamily="$body" fontWeight="700" 
                  color="$color12"
                  lineHeight={28}
                >
                  {todayWorkout?.name || 'Loading...'}
                </Text>
                {todayWorkout?.description && (
                  <Text 
                    color="$color10" 
                    fontSize={14} 
                    fontFamily="$body"
                    lineHeight={20}
                  >
                    {todayWorkout.description}
                  </Text>
                )}
              </YStack>

              {/* Workout Stats Row */}
              {todayWorkout && (
                <XStack gap="$4" flexWrap="wrap">
                  <XStack items="center" gap="$2">
                    <Dumbbell size={16} color="$primary" />
                    <Text fontSize={14} color="$color11" fontFamily="$body" fontWeight="500">
                      {todayWorkout.exercises.length} exercises
                    </Text>
                  </XStack>
                  {/* Intensity badge - default to medium for now */}
                  <IntensityBadge intensity="medium" />
                </XStack>
              )}

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
                  bg="$accent"
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

          {/* Progress Summary */}
          {progress && (
            <YStack gap="$3">
              <SectionLabel>YOUR PROGRESS</SectionLabel>
              
              <XStack gap="$3" flexWrap="wrap">
                {/* Days Completed */}
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {progress.daysCompleted}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Days{'\n'}Completed
                    </Text>
                  </YStack>
                </Card>

                {/* Current Streak */}
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {progress.currentStreak}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Day{'\n'}Streak
                    </Text>
                  </YStack>
                </Card>

                {/* Exercises Tried */}
                <Card
                  flex={1}
                  minWidth={100}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$1">
                    <StatNumber color="$primary">
                      {progress.uniqueExercisesPerformed}
                    </StatNumber>
                    <Text
                      fontSize={11}
                      color="$color10"
                      text="center"
                      fontFamily="$body" fontWeight="500"
                    >
                      Exercises{'\n'}Tried
                    </Text>
                  </YStack>
                </Card>
              </XStack>
            </YStack>
          )}

        </YStack>
      </ScrollView>
    </YStack>
  )
}
