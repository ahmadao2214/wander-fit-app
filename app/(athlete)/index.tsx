import { YStack, XStack, H2, H3, Text, Card, Button, ScrollView, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { SignOutButton } from '../../components/SignOutButton'
import { useRouter } from 'expo-router'
import { 
  Play, 
  Clock, 
  Dumbbell, 
  Timer, 
  Target,
  Flame,
  TrendingUp,
  Calendar,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../types'

/**
 * Athlete Dashboard - "Today" Tab
 * 
 * HYBRID MODEL:
 * - Shows the scheduled "next workout" prominently
 * - Quick access to start the workout
 * - Progress summary at a glance
 */
export default function AthleteDashboard() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()

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

  // Get the scheduled workout template
  const scheduledWorkout = useQuery(
    api.programTemplates.getWorkout,
    programState ? {
      gppCategoryId: programState.gppCategoryId,
      phase: programState.phase,
      skillLevel: programState.skillLevel,
      week: programState.week,
      day: programState.day,
    } : "skip"
  )

  // Check for active session
  const activeSession = useQuery(
    api.workoutSessions.getCurrentSession,
    user ? {} : "skip"
  )

  if (authLoading || programState === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text color="$gray11">Loading your program...</Text>
      </YStack>
    )
  }

  if (!user) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text>Error loading user data</Text>
        <SignOutButton />
      </YStack>
    )
  }

  // If no program state, user needs to complete intake
  if (!programState) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Target size={48} color="$gray10" />
        <H3>Complete Your Setup</H3>
        <Text color="$gray11" textAlign="center">
          Let's get you started with a personalized training program.
        </Text>
        <Button
          size="$4"
          bg="$green9"
          color="white"
          onPress={() => router.push('/(intake)/sport')}
        >
          Start Setup
        </Button>
      </YStack>
    )
  }

  const phaseName = PHASE_NAMES[programState.phase as keyof typeof PHASE_NAMES] || programState.phase

  return (
    <YStack flex={1} bg="$background">
      <ScrollView flex={1}>
        <YStack
          gap="$4"
          px="$4"
          pt="$6"
          pb="$8"
          maxW={800}
          width="100%"
          self="center"
        >
          {/* Header */}
          <XStack justify="space-between" items="center">
            <YStack>
              <H2>Ready to train?</H2>
              <Text color="$gray11">{user.name}</Text>
            </YStack>
          </XStack>

          {/* Active Session Alert */}
          {activeSession && (
            <Card bg="$orange3" borderColor="$orange8" p="$4" borderRadius="$4">
              <XStack items="center" gap="$3">
                <Clock color="$orange11" size={24} />
                <YStack flex={1}>
                  <Text fontWeight="600" color="$orange11">
                    Workout in Progress
                  </Text>
                  <Text fontSize="$2" color="$orange10">
                    Pick up where you left off
                  </Text>
                </YStack>
                <Button
                  size="$3"
                  bg="$orange9"
                  color="white"
                  onPress={() => {
                    // TODO: Navigate to workout execution
                    console.log('Resume workout:', activeSession._id)
                  }}
                >
                  Resume
                </Button>
              </XStack>
            </Card>
          )}

          {/* Scheduled Workout Card */}
          <Card
            bg="$green2"
            borderColor="$green7"
            borderWidth={2}
            p="$5"
            borderRadius="$6"
            elevation={2}
          >
            <YStack gap="$4">
              {/* Phase Badge */}
              <XStack>
                <Card bg="$green9" px="$3" py="$1" borderRadius="$10">
                  <Text color="white" fontSize="$2" fontWeight="600">
                    {programState.phase} • Week {programState.week} • Day {programState.day}
                  </Text>
                </Card>
              </XStack>

              {/* Workout Title */}
              <YStack gap="$1">
                <Text fontSize="$2" color="$green11" fontWeight="500">
                  TODAY'S WORKOUT
                </Text>
                <H3 color="$green12">
                  {scheduledWorkout?.name || 'Loading...'}
                </H3>
                {scheduledWorkout?.description && (
                  <Text color="$green11" fontSize="$3">
                    {scheduledWorkout.description}
                  </Text>
                )}
              </YStack>

              {/* Workout Stats */}
              {scheduledWorkout && (
                <XStack gap="$4" flexWrap="wrap">
                  <XStack items="center" gap="$2">
                    <Dumbbell size={16} color="$green10" />
                    <Text fontSize="$3" color="$green11">
                      {scheduledWorkout.exercises.length} exercises
                    </Text>
                  </XStack>
                  <XStack items="center" gap="$2">
                    <Timer size={16} color="$green10" />
                    <Text fontSize="$3" color="$green11">
                      ~{scheduledWorkout.estimatedDurationMinutes} min
                    </Text>
                  </XStack>
                </XStack>
              )}

              {/* Start Button */}
              <Button
                size="$5"
                bg="$green9"
                color="white"
                icon={Play}
                fontWeight="700"
                onPress={() => {
                  if (scheduledWorkout) {
                    router.push(`/(athlete)/workout/${scheduledWorkout._id}`)
                  }
                }}
                disabled={!scheduledWorkout}
              >
                Start Workout
              </Button>
            </YStack>
          </Card>

          {/* Progress Summary */}
          {progress && (
            <YStack gap="$3">
              <Text fontSize="$5" fontWeight="600">Your Progress</Text>
              
              <XStack gap="$3" flexWrap="wrap">
                {/* Days Completed */}
                <Card flex={1} minWidth={140} p="$4" bg="$blue2" borderColor="$blue6">
                  <YStack items="center" gap="$2">
                    <Calendar size={24} color="$blue10" />
                    <Text fontSize="$7" fontWeight="700" color="$blue11">
                      {progress.daysCompleted}
                    </Text>
                    <Text fontSize="$2" color="$blue10">Days Completed</Text>
                  </YStack>
                </Card>

                {/* Current Streak */}
                <Card flex={1} minWidth={140} p="$4" bg="$orange2" borderColor="$orange6">
                  <YStack items="center" gap="$2">
                    <Flame size={24} color="$orange10" />
                    <Text fontSize="$7" fontWeight="700" color="$orange11">
                      {progress.currentStreak}
                    </Text>
                    <Text fontSize="$2" color="$orange10">Day Streak</Text>
                  </YStack>
                </Card>

                {/* Exercises Tried */}
                <Card flex={1} minWidth={140} p="$4" bg="$purple2" borderColor="$purple6">
                  <YStack items="center" gap="$2">
                    <TrendingUp size={24} color="$purple10" />
                    <Text fontSize="$7" fontWeight="700" color="$purple11">
                      {progress.uniqueExercisesPerformed}
                    </Text>
                    <Text fontSize="$2" color="$purple10">Exercises Tried</Text>
                  </YStack>
                </Card>
              </XStack>
            </YStack>
          )}

          {/* Phase Info */}
          <Card p="$4" bg="$gray2" borderColor="$gray6">
            <YStack gap="$2">
              <Text fontSize="$2" color="$gray10" fontWeight="500">
                CURRENT PHASE
              </Text>
              <Text fontSize="$5" fontWeight="600">
                {phaseName}
              </Text>
              <Text fontSize="$3" color="$gray11">
                {programState.phase === 'GPP' && 
                  'Building your foundation with general fitness, movement quality, and work capacity.'}
                {programState.phase === 'SPP' && 
                  'Developing sport-specific strength and power that transfers to your sport.'}
                {programState.phase === 'SSP' && 
                  'Final preparation phase - maintaining fitness while peaking for competition.'}
              </Text>
            </YStack>
          </Card>
        </YStack>
      </ScrollView>
    </YStack>
  )
}

