import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled, Progress } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useAuth } from '../../../../hooks/useAuth'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  TrendingUp,
  Target,
  Calendar,
  Award,
  Flame,
  Dumbbell,
  CheckCircle,
} from '@tamagui/lucide-icons'
import { Id } from '../../../../convex/_generated/dataModel'
import { PHASE_NAMES } from '../../../../types'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 24,
  letterSpacing: 0.5,
  color: '$color12',
})

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

const StatNumber = styled(Text, {
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: 32,
})

const StatLabel = styled(Text, {
  fontFamily: '$body',
  fontSize: 12,
  color: '$color10',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AthleteProgressPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const athleteId = id as Id<"users">

  // Get athlete details
  const athleteDetails = useQuery(
    api.trainerQueries.getAthleteDetails,
    athleteId ? { athleteUserId: athleteId } : "skip"
  )

  // Verify trainer relationship
  const relationship = useQuery(
    api.trainerRelationships.getRelationship,
    user && athleteId
      ? { trainerId: user._id, athleteUserId: athleteId }
      : "skip"
  )

  if (authLoading || !athleteDetails) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading progress...
        </Text>
      </YStack>
    )
  }

  if (!relationship) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$4">
        <Text fontFamily="$body" color="$color10">
          Athlete not found or not linked to you.
        </Text>
        <Button onPress={() => router.back()}>Go Back</Button>
      </YStack>
    )
  }

  const { athlete, program, progress, recentWorkoutsCount, totalCompletedWorkouts } = athleteDetails

  // Calculate phase progress (assuming 4 weeks per phase, 4-5 workouts per week)
  const getPhaseProgress = () => {
    if (!program) return 0
    const totalDaysInPhase = 28 // 4 weeks
    const currentDayInPhase = (program.currentWeek - 1) * 7 + program.currentDay
    return Math.min((currentDayInPhase / totalDaysInPhase) * 100, 100)
  }

  const phaseProgress = getPhaseProgress()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
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
            <XStack items="center" gap="$3">
              <Button
                size="$3"
                bg="$surface"
                borderWidth={1}
                borderColor="$borderColor"
                icon={ArrowLeft}
                onPress={() => router.back()}
                circular
              />
              <YStack flex={1}>
                <DisplayHeading>PROGRESS</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  {athlete.name}
                </Text>
              </YStack>
            </XStack>

            {/* Current Phase Progress */}
            {program && (
              <Card
                p="$5"
                bg="$brand1"
                rounded="$5"
                borderWidth={0}
              >
                <YStack gap="$4">
                  <XStack items="center" gap="$3">
                    <YStack bg="$primary" p="$3" rounded="$10">
                      <Target size={24} color="white" />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={16}>
                        {PHASE_NAMES[program.currentPhase as keyof typeof PHASE_NAMES] || program.currentPhase}
                      </Text>
                      <Text color="$color10" fontFamily="$body" fontSize={14}>
                        Week {program.currentWeek}, Day {program.currentDay}
                      </Text>
                    </YStack>
                    <Text fontFamily="$body" fontWeight="700" color="$primary" fontSize={18}>
                      {Math.round(phaseProgress)}%
                    </Text>
                  </XStack>
                  <Progress value={phaseProgress} size="$2" bg="$color5">
                    <Progress.Indicator animation="bouncy" bg="$primary" />
                  </Progress>
                </YStack>
              </Card>
            )}

            {/* Main Stats Grid */}
            <YStack gap="$3">
              <SectionLabel>OVERALL PROGRESS</SectionLabel>

              <XStack gap="$3" flexWrap="wrap">
                {/* Days Completed */}
                <Card
                  flex={1}
                  minWidth={150}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$2">
                    <YStack bg="$brand2" p="$2" rounded="$10">
                      <CheckCircle size={20} color="$primary" />
                    </YStack>
                    <StatNumber color="$primary">
                      {progress?.daysCompleted ?? 0}
                    </StatNumber>
                    <StatLabel text="center">Days Completed</StatLabel>
                  </YStack>
                </Card>

                {/* Total Workouts */}
                <Card
                  flex={1}
                  minWidth={150}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$2">
                    <YStack bg="$intensityLow2" p="$2" rounded="$10">
                      <Dumbbell size={20} color="$intensityLow6" />
                    </YStack>
                    <StatNumber color="$intensityLow6">
                      {totalCompletedWorkouts}
                    </StatNumber>
                    <StatLabel text="center">Total Workouts</StatLabel>
                  </YStack>
                </Card>
              </XStack>

              <XStack gap="$3" flexWrap="wrap">
                {/* Current Streak */}
                <Card
                  flex={1}
                  minWidth={150}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$2">
                    <YStack bg="$catPowerLight" p="$2" rounded="$10">
                      <Flame size={20} color="$catPower" />
                    </YStack>
                    <StatNumber color="$catPower">
                      {progress?.currentStreak ?? 0}
                    </StatNumber>
                    <StatLabel text="center">Current Streak</StatLabel>
                  </YStack>
                </Card>

                {/* Longest Streak */}
                <Card
                  flex={1}
                  minWidth={150}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$2">
                    <YStack bg="$yellow3" p="$2" rounded="$10">
                      <Award size={20} color="$yellow11" />
                    </YStack>
                    <StatNumber color="$yellow11">
                      {progress?.longestStreak ?? 0}
                    </StatNumber>
                    <StatLabel text="center">Best Streak</StatLabel>
                  </YStack>
                </Card>
              </XStack>
            </YStack>

            {/* Weekly Activity */}
            <YStack gap="$3">
              <SectionLabel>WEEKLY ACTIVITY</SectionLabel>

              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <XStack items="center" gap="$3">
                  <YStack bg="$green3" p="$3" rounded="$10">
                    <TrendingUp size={24} color="$green11" />
                  </YStack>
                  <YStack flex={1}>
                    <Text fontFamily="$body" fontWeight="700" color="$green11" fontSize={24}>
                      {recentWorkoutsCount}
                    </Text>
                    <Text color="$color10" fontFamily="$body" fontSize={14}>
                      Workouts this week
                    </Text>
                  </YStack>
                  <YStack items="flex-end">
                    <Text fontFamily="$body" fontWeight="600" color="$color10" fontSize={12}>
                      Target: 4-5
                    </Text>
                    <Text
                      fontFamily="$body"
                      fontSize={12}
                      color={recentWorkoutsCount >= 4 ? '$green11' : '$yellow11'}
                    >
                      {recentWorkoutsCount >= 4 ? 'On track' : 'Keep going!'}
                    </Text>
                  </YStack>
                </XStack>
              </Card>
            </YStack>

            {/* Exercise Coverage */}
            {progress && (
              <YStack gap="$3">
                <SectionLabel>EXERCISE COVERAGE</SectionLabel>

                <Card
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack gap="$3">
                    <XStack items="center" gap="$3">
                      <YStack bg="$brand2" p="$2" rounded="$10">
                        <Dumbbell size={20} color="$primary" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={15}>
                          Unique Exercises
                        </Text>
                        <Text color="$color10" fontFamily="$body" fontSize={13}>
                          Different exercises performed
                        </Text>
                      </YStack>
                      <Text fontFamily="$body" fontWeight="700" color="$primary" fontSize={24}>
                        {progress.uniqueExercisesPerformed}
                      </Text>
                    </XStack>
                  </YStack>
                </Card>
              </YStack>
            )}

            {/* Phase Completion */}
            {program && (
              <YStack gap="$3">
                <SectionLabel>PHASE COMPLETION</SectionLabel>

                <YStack gap="$2">
                  {/* GPP */}
                  <Card
                    p="$4"
                    bg="$surface"
                    rounded="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <XStack items="center" gap="$3">
                      <YStack
                        width={40}
                        height={40}
                        rounded="$4"
                        bg={program.currentPhase === 'GPP' ? '$primary' : program.sppUnlockedAt ? '$green5' : '$color4'}
                        items="center"
                        justify="center"
                      >
                        <Text
                          fontFamily="$body"
                          fontWeight="700"
                          fontSize={12}
                          color={program.currentPhase === 'GPP' ? 'white' : program.sppUnlockedAt ? '$green11' : '$color10'}
                        >
                          GPP
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text fontFamily="$body" fontWeight="500" color="$color12" fontSize={14}>
                          General Physical Preparedness
                        </Text>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          {program.sppUnlockedAt ? 'Completed' : program.currentPhase === 'GPP' ? 'In Progress' : 'Locked'}
                        </Text>
                      </YStack>
                      {program.sppUnlockedAt && <CheckCircle size={20} color="$green11" />}
                    </XStack>
                  </Card>

                  {/* SPP */}
                  <Card
                    p="$4"
                    bg="$surface"
                    rounded="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <XStack items="center" gap="$3">
                      <YStack
                        width={40}
                        height={40}
                        rounded="$4"
                        bg={program.currentPhase === 'SPP' ? '$primary' : program.sspUnlockedAt ? '$green5' : '$color4'}
                        items="center"
                        justify="center"
                      >
                        <Text
                          fontFamily="$body"
                          fontWeight="700"
                          fontSize={12}
                          color={program.currentPhase === 'SPP' ? 'white' : program.sspUnlockedAt ? '$green11' : '$color10'}
                        >
                          SPP
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text fontFamily="$body" fontWeight="500" color="$color12" fontSize={14}>
                          Specific Physical Preparedness
                        </Text>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          {program.sspUnlockedAt ? 'Completed' : program.currentPhase === 'SPP' ? 'In Progress' : program.sppUnlockedAt ? 'Available' : 'Locked'}
                        </Text>
                      </YStack>
                      {program.sspUnlockedAt && <CheckCircle size={20} color="$green11" />}
                    </XStack>
                  </Card>

                  {/* SSP */}
                  <Card
                    p="$4"
                    bg="$surface"
                    rounded="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <XStack items="center" gap="$3">
                      <YStack
                        width={40}
                        height={40}
                        rounded="$4"
                        bg={program.currentPhase === 'SSP' ? '$primary' : '$color4'}
                        items="center"
                        justify="center"
                      >
                        <Text
                          fontFamily="$body"
                          fontWeight="700"
                          fontSize={12}
                          color={program.currentPhase === 'SSP' ? 'white' : '$color10'}
                        >
                          SSP
                        </Text>
                      </YStack>
                      <YStack flex={1}>
                        <Text fontFamily="$body" fontWeight="500" color="$color12" fontSize={14}>
                          Sport-Specific Preparedness
                        </Text>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          {program.currentPhase === 'SSP' ? 'In Progress' : program.sspUnlockedAt ? 'Available' : 'Locked'}
                        </Text>
                      </YStack>
                    </XStack>
                  </Card>
                </YStack>
              </YStack>
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
