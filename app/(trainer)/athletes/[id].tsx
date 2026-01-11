import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { useAuth } from '../../../hooks/useAuth'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  User,
  Target,
  Calendar,
  TrendingUp,
  Clock,
  History,
  Dumbbell,
  ChevronRight,
  UserMinus,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../../types'
import { Id } from '../../../convex/_generated/dataModel'

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
  fontSize: 24,
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AthleteDetailPage() {
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
          Loading athlete...
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

  const { athlete, program, sport, progress, recentWorkoutsCount } = athleteDetails

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
                <DisplayHeading>{athlete.name?.toUpperCase()}</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  {athlete.email}
                </Text>
              </YStack>
            </XStack>

            {/* Athlete Profile Card */}
            <Card
              p="$5"
              bg="$brand1"
              rounded="$5"
              borderWidth={0}
            >
              <XStack items="center" gap="$4">
                <YStack
                  width={64}
                  height={64}
                  rounded="$10"
                  bg="$primary"
                  items="center"
                  justify="center"
                >
                  <User size={32} color="white" />
                </YStack>
                <YStack flex={1} gap="$1">
                  <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={18}>
                    {athlete.name}
                  </Text>
                  {sport && (
                    <Text color="$color10" fontFamily="$body" fontSize={14}>
                      {sport}
                    </Text>
                  )}
                  {program && (
                    <XStack items="center" gap="$2" pt="$1">
                      <Target size={14} color="$primary" />
                      <Text fontSize={13} color="$primary" fontFamily="$body" fontWeight="600">
                        {program.skillLevel} Level
                      </Text>
                    </XStack>
                  )}
                </YStack>
              </XStack>
            </Card>

            {/* Program Status */}
            {program ? (
              <YStack gap="$3">
                <SectionLabel>CURRENT PROGRAM</SectionLabel>

                <Card
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack gap="$4">
                    <XStack items="center" gap="$3">
                      <YStack bg="$brand2" p="$2" rounded="$10">
                        <Target size={18} color="$primary" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          Current Phase
                        </Text>
                        <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                          {PHASE_NAMES[program.currentPhase as keyof typeof PHASE_NAMES] || program.currentPhase}
                        </Text>
                      </YStack>
                    </XStack>

                    <XStack items="center" gap="$3">
                      <YStack bg="$catPowerLight" p="$2" rounded="$10">
                        <Calendar size={18} color="$catPower" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          Position
                        </Text>
                        <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                          Week {program.currentWeek}, Day {program.currentDay}
                        </Text>
                      </YStack>
                    </XStack>

                    <XStack items="center" gap="$3">
                      <YStack bg="$intensityLow2" p="$2" rounded="$10">
                        <Clock size={18} color="$intensityLow6" />
                      </YStack>
                      <YStack flex={1}>
                        <Text fontSize={12} color="$color10" fontFamily="$body">
                          Last Workout
                        </Text>
                        <Text fontSize={15} fontFamily="$body" fontWeight="600" color="$color12">
                          {program.lastWorkoutDate
                            ? new Date(program.lastWorkoutDate).toLocaleDateString()
                            : 'No workouts yet'}
                        </Text>
                      </YStack>
                    </XStack>
                  </YStack>
                </Card>
              </YStack>
            ) : (
              <Card
                p="$5"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
              >
                <YStack items="center" gap="$3">
                  <Text fontFamily="$body" fontWeight="600" color="$color10">
                    No Program Assigned
                  </Text>
                  <Text text="center" color="$color9" fontFamily="$body" fontSize={13}>
                    This athlete hasn't completed their intake yet.
                  </Text>
                </YStack>
              </Card>
            )}

            {/* Progress Stats */}
            {progress && (
              <YStack gap="$3">
                <SectionLabel>PROGRESS</SectionLabel>

                <XStack gap="$3" flexWrap="wrap">
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
                      <StatNumber color="$accent">
                        {progress.currentStreak}
                      </StatNumber>
                      <Text
                        fontSize={11}
                        color="$color10"
                        text="center"
                        fontFamily="$body" fontWeight="500"
                      >
                        Current{'\n'}Streak
                      </Text>
                    </YStack>
                  </Card>

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
                      <StatNumber color="$catPower">
                        {recentWorkoutsCount}
                      </StatNumber>
                      <Text
                        fontSize={11}
                        color="$color10"
                        text="center"
                        fontFamily="$body" fontWeight="500"
                      >
                        This{'\n'}Week
                      </Text>
                    </YStack>
                  </Card>
                </XStack>
              </YStack>
            )}

            {/* Quick Actions */}
            <YStack gap="$3">
              <SectionLabel>QUICK ACTIONS</SectionLabel>

              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                pressStyle={{ bg: '$surfaceHover' }}
                onPress={() => router.push(`/(trainer)/athletes/${id}/history`)}
              >
                <XStack items="center" gap="$3">
                  <YStack bg="$brand2" p="$2" rounded="$10">
                    <History size={18} color="$primary" />
                  </YStack>
                  <Text
                    flex={1}
                    fontSize={15}
                    fontFamily="$body" fontWeight="500"
                    color="$color12"
                  >
                    View Workout History
                  </Text>
                  <ChevronRight size={20} color="$color9" />
                </XStack>
              </Card>

              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                pressStyle={{ bg: '$surfaceHover' }}
                onPress={() => router.push(`/(trainer)/athletes/${id}/progress`)}
              >
                <XStack items="center" gap="$3">
                  <YStack bg="$intensityLow2" p="$2" rounded="$10">
                    <TrendingUp size={18} color="$intensityLow6" />
                  </YStack>
                  <Text
                    flex={1}
                    fontSize={15}
                    fontFamily="$body" fontWeight="500"
                    color="$color12"
                  >
                    View Progress Details
                  </Text>
                  <ChevronRight size={20} color="$color9" />
                </XStack>
              </Card>

              <Card
                p="$4"
                bg="$surface"
                rounded="$4"
                borderWidth={1}
                borderColor="$borderColor"
                pressStyle={{ bg: '$surfaceHover' }}
                onPress={() => router.push(`/(trainer)/athletes/${id}/program`)}
              >
                <XStack items="center" gap="$3">
                  <YStack bg="$catPowerLight" p="$2" rounded="$10">
                    <Dumbbell size={18} color="$catPower" />
                  </YStack>
                  <Text
                    flex={1}
                    fontSize={15}
                    fontFamily="$body" fontWeight="500"
                    color="$color12"
                  >
                    Modify Program
                  </Text>
                  <ChevronRight size={20} color="$color9" />
                </XStack>
              </Card>
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
