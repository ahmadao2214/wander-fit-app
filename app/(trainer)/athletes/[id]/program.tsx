import { useState } from 'react'
import { YStack, XStack, Text, Button, Card, Spinner, ScrollView, styled, Sheet, Input } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useAuth } from '../../../../hooks/useAuth'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ArrowLeft,
  Dumbbell,
  ChevronRight,
  Target,
  Calendar,
  Play,
  Search,
  Plus,
  X,
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AthleteProgramPage() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [selectedPhase, setSelectedPhase] = useState<'GPP' | 'SPP' | 'SSP'>('GPP')
  const [showExerciseSheet, setShowExerciseSheet] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')

  const athleteId = id as Id<"users">

  // Get athlete details
  const athleteDetails = useQuery(
    api.trainerQueries.getAthleteDetails,
    athleteId ? { athleteUserId: athleteId } : "skip"
  )

  // Get program overview
  const programOverview = useQuery(
    api.trainerQueries.getAthleteProgramOverview,
    athleteId ? { athleteUserId: athleteId } : "skip"
  )

  // Get current workout
  const currentWorkout = useQuery(
    api.trainerQueries.getAthleteCurrentWorkout,
    athleteId ? { athleteUserId: athleteId } : "skip"
  )

  // Get available exercises for adding
  const availableExercises = useQuery(
    api.trainerWorkoutModifications.getAvailableExercises,
    { searchQuery: exerciseSearch || undefined, limit: 20 }
  )

  // Verify trainer relationship
  const relationship = useQuery(
    api.trainerRelationships.getRelationship,
    user && athleteId
      ? { trainerId: user._id, athleteUserId: athleteId }
      : "skip"
  )

  // Mutations
  const setTodayFocus = useMutation(api.trainerWorkoutModifications.setTodayFocus)
  const clearTodayFocus = useMutation(api.trainerWorkoutModifications.clearTodayFocus)

  if (authLoading || !athleteDetails) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$primary" />
        <Text color="$color10" fontFamily="$body">
          Loading program...
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

  const { athlete, program } = athleteDetails

  if (!program || !programOverview) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" px="$4" pt={insets.top + 16}>
          <XStack items="center" gap="$3" mb="$5">
            <Button
              size="$3"
              bg="$surface"
              borderWidth={1}
              borderColor="$borderColor"
              icon={ArrowLeft}
              onPress={() => router.back()}
              circular
            />
            <DisplayHeading>PROGRAM</DisplayHeading>
          </XStack>

          <Card
            p="$6"
            bg="$surface"
            rounded="$4"
            borderWidth={1}
            borderColor="$borderColor"
          >
            <YStack items="center" gap="$3">
              <YStack bg="$brand2" p="$3" rounded="$10">
                <Dumbbell size={24} color="$primary" />
              </YStack>
              <Text fontFamily="$body" fontWeight="600" color="$color10">
                No Program Assigned
              </Text>
              <Text text="center" color="$color9" fontFamily="$body" fontSize={13}>
                This athlete hasn't completed their intake questionnaire yet.
              </Text>
            </YStack>
          </Card>
        </YStack>
      </>
    )
  }

  const handleSetTodayFocus = async (templateId: Id<"program_templates">) => {
    if (!user) return
    try {
      await setTodayFocus({
        trainerId: user._id,
        athleteUserId: athleteId,
        templateId,
      })
    } catch (err) {
      console.error('Error setting today focus:', err)
    }
  }

  const handleClearTodayFocus = async () => {
    if (!user) return
    try {
      await clearTodayFocus({
        trainerId: user._id,
        athleteUserId: athleteId,
      })
    } catch (err) {
      console.error('Error clearing today focus:', err)
    }
  }

  const selectedPhaseData = programOverview.structure.find((p) => p.phase === selectedPhase)

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
                <DisplayHeading>PROGRAM</DisplayHeading>
                <Text color="$color10" fontFamily="$body" fontSize={14}>
                  {athlete.name} - {programOverview.sport ?? 'Athlete'}
                </Text>
              </YStack>
            </XStack>

            {/* Current Workout */}
            {currentWorkout && (
              <Card
                p="$4"
                bg="$brand1"
                rounded="$5"
                borderWidth={0}
              >
                <YStack gap="$3">
                  <XStack items="center" gap="$3">
                    <YStack bg="$primary" p="$2" rounded="$10">
                      <Target size={20} color="white" />
                    </YStack>
                    <YStack flex={1}>
                      <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={14}>
                        Today's Scheduled Workout
                      </Text>
                      <Text color="$color10" fontFamily="$body" fontSize={12}>
                        {currentWorkout.template.name}
                      </Text>
                    </YStack>
                    <Button
                      size="$3"
                      bg="$primary"
                      color="white"
                      icon={Play}
                      circular
                      onPress={() => {
                        // Navigate to workout detail
                      }}
                    />
                  </XStack>
                  <XStack gap="$3">
                    <Text fontSize={12} color="$color9" fontFamily="$body">
                      {PHASE_NAMES[currentWorkout.template.phase as keyof typeof PHASE_NAMES]} - W{currentWorkout.template.week}D{currentWorkout.template.day}
                    </Text>
                    <Text fontSize={12} color="$color9" fontFamily="$body">
                      {currentWorkout.exercises.length} exercises
                    </Text>
                    <Text fontSize={12} color="$color9" fontFamily="$body">
                      ~{currentWorkout.template.estimatedDurationMinutes} min
                    </Text>
                  </XStack>
                </YStack>
              </Card>
            )}

            {/* Phase Selector */}
            <YStack gap="$3">
              <SectionLabel>PROGRAM PHASES</SectionLabel>

              <XStack gap="$2">
                {(['GPP', 'SPP', 'SSP'] as const).map((phase) => {
                  const phaseData = programOverview.structure.find((p) => p.phase === phase)
                  const isSelected = selectedPhase === phase
                  const isCurrent = program.currentPhase === phase
                  const isUnlocked = phaseData?.unlocked

                  return (
                    <Button
                      key={phase}
                      flex={1}
                      size="$4"
                      bg={isSelected ? '$primary' : isUnlocked ? '$surface' : '$color3'}
                      borderWidth={1}
                      borderColor={isSelected ? '$primary' : '$borderColor'}
                      onPress={() => isUnlocked && setSelectedPhase(phase)}
                      disabled={!isUnlocked}
                      opacity={isUnlocked ? 1 : 0.5}
                    >
                      <YStack items="center" gap="$1">
                        <Text
                          fontFamily="$body"
                          fontWeight="700"
                          fontSize={12}
                          color={isSelected ? 'white' : '$color11'}
                        >
                          {phase}
                        </Text>
                        {isCurrent && (
                          <Text
                            fontSize={9}
                            color={isSelected ? 'white' : '$primary'}
                            fontFamily="$body"
                          >
                            Current
                          </Text>
                        )}
                      </YStack>
                    </Button>
                  )
                })}
              </XStack>
            </YStack>

            {/* Week/Day Grid */}
            {selectedPhaseData && (
              <YStack gap="$3">
                <SectionLabel>
                  {PHASE_NAMES[selectedPhase as keyof typeof PHASE_NAMES]} WORKOUTS
                </SectionLabel>

                {selectedPhaseData.weeks.map((week) => (
                  <Card
                    key={week.week}
                    p="$4"
                    bg="$surface"
                    rounded="$4"
                    borderWidth={1}
                    borderColor="$borderColor"
                  >
                    <YStack gap="$3">
                      <XStack items="center" gap="$2">
                        <Calendar size={16} color="$primary" />
                        <Text fontFamily="$body" fontWeight="600" color="$color12" fontSize={14}>
                          Week {week.week}
                        </Text>
                        {program.currentPhase === selectedPhase && program.currentWeek === week.week && (
                          <Card px="$2" py="$1" bg="$primary" rounded="$2">
                            <Text fontSize={10} color="white" fontFamily="$body" fontWeight="600">
                              Current
                            </Text>
                          </Card>
                        )}
                      </XStack>

                      <YStack gap="$2">
                        {week.days.map((day) => {
                          const isCurrent =
                            program.currentPhase === selectedPhase &&
                            program.currentWeek === week.week &&
                            program.currentDay === day.day

                          if (!day.template) {
                            return (
                              <XStack
                                key={day.day}
                                p="$3"
                                bg="$color3"
                                rounded="$3"
                                items="center"
                                gap="$2"
                              >
                                <Text
                                  fontFamily="$body"
                                  fontWeight="600"
                                  color="$color9"
                                  fontSize={12}
                                  width={60}
                                >
                                  Day {day.day}
                                </Text>
                                <Text
                                  flex={1}
                                  fontFamily="$body"
                                  color="$color9"
                                  fontSize={13}
                                >
                                  Rest Day
                                </Text>
                              </XStack>
                            )
                          }

                          return (
                            <Card
                              key={day.day}
                              p="$3"
                              bg={isCurrent ? '$brand2' : '$background'}
                              rounded="$3"
                              borderWidth={1}
                              borderColor={isCurrent ? '$primary' : '$borderColor'}
                              pressStyle={{ bg: '$surfaceHover' }}
                              onPress={() => {
                                // Navigate to workout editor
                              }}
                            >
                              <XStack items="center" gap="$2">
                                <Text
                                  fontFamily="$body"
                                  fontWeight="600"
                                  color={isCurrent ? '$primary' : '$color10'}
                                  fontSize={12}
                                  width={60}
                                >
                                  Day {day.day}
                                </Text>
                                <YStack flex={1}>
                                  <Text
                                    fontFamily="$body"
                                    fontWeight="500"
                                    color="$color12"
                                    fontSize={13}
                                  >
                                    {day.template.name}
                                  </Text>
                                  <Text
                                    fontFamily="$body"
                                    color="$color9"
                                    fontSize={11}
                                  >
                                    {day.template.exercises.length} exercises - ~{day.template.estimatedDurationMinutes} min
                                  </Text>
                                </YStack>
                                <XStack gap="$2">
                                  {!isCurrent && (
                                    <Button
                                      size="$2"
                                      bg="$color4"
                                      icon={Target}
                                      circular
                                      onPress={(e) => {
                                        e.stopPropagation()
                                        handleSetTodayFocus(day.template!._id)
                                      }}
                                    />
                                  )}
                                  <ChevronRight size={16} color="$color9" />
                                </XStack>
                              </XStack>
                            </Card>
                          )
                        })}
                      </YStack>
                    </YStack>
                  </Card>
                ))}
              </YStack>
            )}

            {/* Add Exercise Button */}
            <Button
              size="$4"
              bg="$surface"
              borderWidth={1}
              borderColor="$borderColor"
              fontFamily="$body"
              fontWeight="600"
              color="$color11"
              rounded="$4"
              icon={Plus}
              onPress={() => setShowExerciseSheet(true)}
            >
              Browse Exercise Library
            </Button>
          </YStack>
        </ScrollView>

        {/* Exercise Library Sheet */}
        <Sheet
          modal
          open={showExerciseSheet}
          onOpenChange={setShowExerciseSheet}
          snapPoints={[80]}
          dismissOnSnapToBottom
        >
          <Sheet.Overlay />
          <Sheet.Frame bg="$background" p="$4">
            <Sheet.Handle />
            <YStack gap="$4" pt="$4">
              <XStack items="center" justify="space-between">
                <Text fontFamily="$body" fontWeight="700" fontSize={18} color="$color12">
                  Exercise Library
                </Text>
                <Button
                  size="$3"
                  bg="$surface"
                  icon={X}
                  circular
                  onPress={() => setShowExerciseSheet(false)}
                />
              </XStack>

              <XStack items="center" gap="$2" bg="$surface" rounded="$3" px="$3">
                <Search size={18} color="$color10" />
                <Input
                  flex={1}
                  placeholder="Search exercises..."
                  value={exerciseSearch}
                  onChangeText={setExerciseSearch}
                  bg="transparent"
                  borderWidth={0}
                  fontFamily="$body"
                />
              </XStack>

              <ScrollView flex={1}>
                <YStack gap="$2">
                  {availableExercises?.map((exercise) => (
                    <Card
                      key={exercise._id}
                      p="$3"
                      bg="$surface"
                      rounded="$3"
                      borderWidth={1}
                      borderColor="$borderColor"
                      pressStyle={{ bg: '$surfaceHover' }}
                    >
                      <XStack items="center" gap="$3">
                        <YStack
                          width={40}
                          height={40}
                          rounded="$3"
                          bg="$brand2"
                          items="center"
                          justify="center"
                        >
                          <Dumbbell size={18} color="$primary" />
                        </YStack>
                        <YStack flex={1}>
                          <Text fontFamily="$body" fontWeight="500" color="$color12" fontSize={14}>
                            {exercise.name}
                          </Text>
                          <XStack gap="$1" flexWrap="wrap">
                            {exercise.tags.slice(0, 3).map((tag) => (
                              <Text key={tag} fontSize={10} color="$color9" fontFamily="$body">
                                {tag}
                              </Text>
                            ))}
                          </XStack>
                        </YStack>
                        <Button
                          size="$2"
                          bg="$primary"
                          icon={Plus}
                          circular
                        />
                      </XStack>
                    </Card>
                  ))}
                </YStack>
              </ScrollView>
            </YStack>
          </Sheet.Frame>
        </Sheet>
      </YStack>
    </>
  )
}
