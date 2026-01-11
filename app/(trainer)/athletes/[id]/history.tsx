import { useState, useEffect } from 'react'
import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useAuth } from '../../../../hooks/useAuth'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, History, ChevronDown } from '@tamagui/lucide-icons'
import { WorkoutHistoryCard } from '../../../../components/trainer/WorkoutHistoryCard'
import { Id } from '../../../../convex/_generated/dataModel'

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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AthleteHistoryPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [offset, setOffset] = useState(0)
  const limit = 20

  const athleteId = id as Id<"users">

  // Reset offset when athlete changes to prevent showing wrong page
  useEffect(() => {
    setOffset(0)
  }, [id])

  // Get athlete details
  const athleteDetails = useQuery(
    api.trainerQueries.getAthleteDetails,
    athleteId ? { athleteUserId: athleteId } : "skip"
  )

  // Get workout history
  const workoutHistory = useQuery(
    api.trainerQueries.getAthleteWorkoutHistory,
    athleteId ? { athleteUserId: athleteId, limit, offset } : "skip"
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
          Loading history...
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

  const { athlete } = athleteDetails

  const handleLoadMore = () => {
    if (workoutHistory?.hasMore) {
      setOffset((prev) => prev + limit)
    }
  }

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
                <DisplayHeading>WORKOUT HISTORY</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  {athlete.name}
                </Text>
              </YStack>
            </XStack>

            {/* Summary Stats */}
            <Card
              p="$4"
              bg="$brand1"
              rounded="$5"
              borderWidth={0}
            >
              <XStack items="center" gap="$4">
                <YStack bg="$primary" p="$3" rounded="$10">
                  <History size={24} color="white" />
                </YStack>
                <YStack flex={1}>
                  <Text fontFamily="$body" fontWeight="700" color="$color12" fontSize={24}>
                    {workoutHistory?.total ?? 0}
                  </Text>
                  <Text color="$color10" fontFamily="$body" fontSize={14}>
                    Total Workouts
                  </Text>
                </YStack>
              </XStack>
            </Card>

            {/* Workout List */}
            <YStack gap="$3">
              <SectionLabel>RECENT WORKOUTS</SectionLabel>

              {workoutHistory?.sessions && workoutHistory.sessions.length > 0 ? (
                <YStack gap="$2">
                  {workoutHistory.sessions.map((session) => (
                    <WorkoutHistoryCard
                      key={session._id}
                      templateName={session.templateName}
                      phase={session.phase}
                      week={session.week}
                      day={session.day}
                      startedAt={session.startedAt}
                      completedAt={session.completedAt}
                      status={session.status}
                      totalDurationSeconds={session.totalDurationSeconds}
                      exerciseCount={session.exerciseCount}
                      completedExerciseCount={session.completedExerciseCount}
                      skippedExerciseCount={session.skippedExerciseCount}
                      targetIntensity={session.targetIntensity}
                    />
                  ))}

                  {/* Load More Button */}
                  {workoutHistory.hasMore && (
                    <Button
                      size="$4"
                      bg="$surface"
                      borderWidth={1}
                      borderColor="$borderColor"
                      fontFamily="$body"
                      fontWeight="600"
                      color="$color11"
                      rounded="$4"
                      icon={ChevronDown}
                      onPress={handleLoadMore}
                      mt="$2"
                    >
                      Load More
                    </Button>
                  )}
                </YStack>
              ) : (
                <Card
                  p="$6"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={1}
                  borderColor="$borderColor"
                >
                  <YStack items="center" gap="$3">
                    <YStack bg="$brand2" p="$3" rounded="$10">
                      <History size={24} color="$primary" />
                    </YStack>
                    <Text fontFamily="$body" fontWeight="600" color="$color10">
                      No Workouts Yet
                    </Text>
                    <Text text="center" color="$color9" fontFamily="$body" fontSize={13}>
                      This athlete hasn't completed any workouts yet.
                    </Text>
                  </YStack>
                </Card>
              )}
            </YStack>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
