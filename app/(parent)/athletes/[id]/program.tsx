import { useState } from 'react'
import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled, Sheet } from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Id } from '../../../../convex/_generated/dataModel'
import {
  ArrowLeft,
  Calendar,
  Dumbbell,
  Clock,
  Eye,
  Edit3,
  Target,
  Check,
  RefreshCw,
  Shuffle,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES } from '../../../../types'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 11,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '$color10',
})

const WorkoutCard = styled(Card, {
  p: '$3',
  rounded: '$3',
  borderWidth: 1,

  variants: {
    status: {
      completed: {
        bg: '$green2',
        borderColor: '$green6',
      },
      current: {
        bg: '$brand1',
        borderColor: '$primary',
      },
      upcoming: {
        bg: '$surface',
        borderColor: '$borderColor',
      },
      selected: {
        bg: '$yellow2',
        borderColor: '$yellow9',
        borderWidth: 2,
      },
    },
  } as const,
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AthleteProgramScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // State for swap mode
  const [isSwapMode, setIsSwapMode] = useState(false)
  const [selectedWorkout, setSelectedWorkout] = useState<{
    day: number
    focus: string
  } | null>(null)

  // Get athlete details
  const athlete = useQuery(
    api.parentRelationships.getAthleteDetails,
    id ? { athleteId: id as Id<'users'> } : 'skip'
  )

  // Get athlete's program state (includes permissions)
  const programState = useQuery(
    api.parentRelationships.getAthleteProgramState,
    id ? { athleteId: id as Id<'users'> } : 'skip'
  )

  // Mutations for schedule control
  const parentSetTodayFocus = useMutation(api.scheduleOverrides.parentSetTodayFocus)
  const parentSwapWorkouts = useMutation(api.scheduleOverrides.parentSwapWorkouts)
  const parentResetPhase = useMutation(api.scheduleOverrides.parentResetPhaseToDefault)

  // Get week schedule
  const weekSchedule = useQuery(
    api.scheduleOverrides.getWeekSchedule,
    programState?.phase && programState?.week
      ? {
          phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
          week: programState.week,
        }
      : 'skip'
  )

  // Check permissions
  const hasFullPermission = programState?.permissions === 'full'
  const canEdit = hasFullPermission

  // Loading state
  if (athlete === undefined || programState === undefined) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
          <Spinner size="large" color="$primary" />
          <Text color="$color10" fontFamily="$body">
            Loading program...
          </Text>
        </YStack>
      </>
    )
  }

  // Not found or no program
  if (athlete === null || !athlete.program) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" items="center" justify="center" gap="$4" px="$6">
          <Text fontSize={16} fontFamily="$body" color="$color10" text="center">
            No program found for this athlete.
          </Text>
          <Button onPress={() => router.back()}>Go Back</Button>
        </YStack>
      </>
    )
  }

  const { program } = athlete
  const phases = ['GPP', 'SPP', 'SSP'] as const

  // Handle workout selection for swap
  const handleWorkoutPress = (day: number, focus: string) => {
    if (!isSwapMode) return

    if (!selectedWorkout) {
      setSelectedWorkout({ day, focus })
    } else if (selectedWorkout.day === day) {
      // Deselect
      setSelectedWorkout(null)
    } else {
      // Perform swap
      handleSwap(selectedWorkout.day, day)
    }
  }

  // Handle swap
  const handleSwap = async (dayA: number, dayB: number) => {
    if (!programState) return

    try {
      await parentSwapWorkouts({
        athleteId: id as Id<'users'>,
        slotA: {
          phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
          week: programState.week,
          day: dayA,
        },
        slotB: {
          phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
          week: programState.week,
          day: dayB,
        },
      })
      setSelectedWorkout(null)
      setIsSwapMode(false)
    } catch (err) {
      console.error('Failed to swap:', err)
    }
  }

  // Handle reset
  const handleReset = async () => {
    if (!programState) return

    try {
      await parentResetPhase({
        athleteId: id as Id<'users'>,
        phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
      })
    } catch (err) {
      console.error('Failed to reset:', err)
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `${athlete.name}'s Program`,
          headerLeft: () => (
            <Button
              size="$3"
              bg="transparent"
              onPress={() => router.back()}
              icon={ArrowLeft}
              circular
            />
          ),
        }}
      />

      <YStack flex={1} bg="$background">
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack
            gap="$5"
            px="$4"
            pt="$4"
            pb={insets.bottom + 40}
            maxW={600}
            width="100%"
            self="center"
          >
            {/* View/Edit Mode Banner */}
            <Card p="$3" bg={canEdit ? '$brand1' : '$color3'} rounded="$3">
              <XStack items="center" gap="$2">
                {canEdit ? (
                  <>
                    <Edit3 size={16} color="$primary" />
                    <Text fontSize={13} fontFamily="$body" color="$primary">
                      Full access - You can modify the schedule
                    </Text>
                  </>
                ) : (
                  <>
                    <Eye size={16} color="$color10" />
                    <Text fontSize={13} fontFamily="$body" color="$color10">
                      View only - Request full access to make changes
                    </Text>
                  </>
                )}
              </XStack>
            </Card>

            {/* Current Position */}
            <YStack gap="$3">
              <SectionLabel>CURRENT POSITION</SectionLabel>

              <Card p="$5" bg="$surface" rounded="$4" borderWidth={2} borderColor="$primary">
                <YStack gap="$4">
                  <XStack items="center" justify="space-between">
                    <Text fontSize={18} fontFamily="$heading" color="$color12">
                      {PHASE_NAMES[program.currentPhase as keyof typeof PHASE_NAMES]}
                    </Text>
                    <XStack bg="$brand2" px="$3" py="$1" rounded="$2">
                      <Text fontSize={12} fontFamily="$body" fontWeight="700" color="$primary">
                        {program.skillLevel.toUpperCase()}
                      </Text>
                    </XStack>
                  </XStack>

                  <XStack gap="$4">
                    <XStack items="center" gap="$2" flex={1}>
                      <Calendar size={16} color="$color10" />
                      <Text fontSize={14} fontFamily="$body" color="$color11">
                        Week {program.currentWeek}
                      </Text>
                    </XStack>
                    <XStack items="center" gap="$2" flex={1}>
                      <Dumbbell size={16} color="$color10" />
                      <Text fontSize={14} fontFamily="$body" color="$color11">
                        Day {program.currentDay}
                      </Text>
                    </XStack>
                  </XStack>
                </YStack>
              </Card>
            </YStack>

            {/* Week Schedule with Edit Capabilities */}
            {weekSchedule && weekSchedule.length > 0 && (
              <YStack gap="$3">
                <XStack items="center" justify="space-between">
                  <SectionLabel>THIS WEEK'S SCHEDULE</SectionLabel>
                  {canEdit && (
                    <XStack gap="$2">
                      {isSwapMode ? (
                        <Button
                          size="$2"
                          bg="$color4"
                          onPress={() => {
                            setIsSwapMode(false)
                            setSelectedWorkout(null)
                          }}
                        >
                          <Text fontSize={11} fontFamily="$body" color="$color11">
                            Cancel
                          </Text>
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="$2"
                            bg="$brand2"
                            icon={Shuffle}
                            onPress={() => setIsSwapMode(true)}
                          >
                            <Text fontSize={11} fontFamily="$body" color="$primary">
                              Swap
                            </Text>
                          </Button>
                          <Button
                            size="$2"
                            bg="$color4"
                            icon={RefreshCw}
                            onPress={handleReset}
                          >
                            <Text fontSize={11} fontFamily="$body" color="$color11">
                              Reset
                            </Text>
                          </Button>
                        </>
                      )}
                    </XStack>
                  )}
                </XStack>

                {isSwapMode && (
                  <Card p="$2" bg="$yellow2" borderColor="$yellow6" borderWidth={1} rounded="$3">
                    <Text fontSize={12} fontFamily="$body" color="$yellow11" text="center">
                      {selectedWorkout
                        ? `Now tap another workout to swap with "${selectedWorkout.focus}"`
                        : 'Tap a workout to select it, then tap another to swap'}
                    </Text>
                  </Card>
                )}

                <YStack gap="$2">
                  {weekSchedule.map((workout: any) => {
                    const isCurrent = workout.day === program.currentDay
                    const isSelected = selectedWorkout?.day === workout.day

                    return (
                      <WorkoutCard
                        key={workout._id}
                        status={
                          isSelected
                            ? 'selected'
                            : isCurrent
                              ? 'current'
                              : 'upcoming'
                        }
                        pressStyle={isSwapMode ? { opacity: 0.8, scale: 0.99 } : {}}
                        onPress={
                          isSwapMode
                            ? () => handleWorkoutPress(workout.day, workout.focus)
                            : undefined
                        }
                      >
                        <XStack items="center" gap="$3">
                          <YStack
                            width={36}
                            height={36}
                            rounded="$10"
                            bg={
                              isSelected
                                ? '$yellow9'
                                : isCurrent
                                  ? '$primary'
                                  : '$color4'
                            }
                            items="center"
                            justify="center"
                          >
                            <Text
                              fontSize={14}
                              fontFamily="$body"
                              fontWeight="700"
                              color={isSelected || isCurrent ? 'white' : '$color11'}
                            >
                              {workout.day}
                            </Text>
                          </YStack>

                          <YStack flex={1}>
                            <Text
                              fontSize={14}
                              fontFamily="$body"
                              fontWeight="600"
                              color={isSelected ? '$yellow11' : isCurrent ? '$primary' : '$color12'}
                            >
                              {workout.focus}
                            </Text>
                            <Text fontSize={11} fontFamily="$body" color="$color10">
                              Day {workout.day}
                              {workout._isOverridden && ' (Modified)'}
                            </Text>
                          </YStack>

                          {isCurrent && !isSwapMode && (
                            <XStack bg="$primary" px="$2" py="$1" rounded="$2">
                              <Text fontSize={9} fontFamily="$body" fontWeight="700" color="white">
                                TODAY
                              </Text>
                            </XStack>
                          )}

                          {isSwapMode && isSelected && (
                            <Check size={20} color="$yellow10" />
                          )}
                        </XStack>
                      </WorkoutCard>
                    )
                  })}
                </YStack>
              </YStack>
            )}

            {/* Training Phases */}
            <YStack gap="$3">
              <SectionLabel>TRAINING PHASES</SectionLabel>

              {phases.map((phase, index) => {
                const isCurrentPhase = program.currentPhase === phase
                const isPastPhase = phases.indexOf(program.currentPhase as any) > index

                return (
                  <Card
                    key={phase}
                    p="$4"
                    bg={isCurrentPhase ? '$brand1' : '$surface'}
                    rounded="$4"
                    borderWidth={isCurrentPhase ? 2 : 1}
                    borderColor={isCurrentPhase ? '$primary' : '$borderColor'}
                  >
                    <XStack items="center" gap="$3">
                      <YStack
                        width={40}
                        height={40}
                        rounded="$10"
                        bg={isCurrentPhase ? '$primary' : isPastPhase ? '$green9' : '$color4'}
                        items="center"
                        justify="center"
                      >
                        <Text fontSize={14} fontFamily="$body" fontWeight="700" color="white">
                          {index + 1}
                        </Text>
                      </YStack>

                      <YStack flex={1}>
                        <Text
                          fontSize={16}
                          fontFamily="$body"
                          fontWeight="600"
                          color={isCurrentPhase ? '$primary' : '$color12'}
                        >
                          {PHASE_NAMES[phase]}
                        </Text>
                        <Text fontSize={12} fontFamily="$body" color="$color10">
                          {phase === 'GPP' && '4 weeks - Foundation building'}
                          {phase === 'SPP' && '4 weeks - Sport-specific focus'}
                          {phase === 'SSP' && '4 weeks - Competition prep'}
                        </Text>
                      </YStack>

                      {isCurrentPhase && (
                        <XStack bg="$primary" px="$2" py="$1" rounded="$2">
                          <Text fontSize={10} fontFamily="$body" fontWeight="700" color="white">
                            CURRENT
                          </Text>
                        </XStack>
                      )}

                      {isPastPhase && (
                        <XStack bg="$green3" px="$2" py="$1" rounded="$2">
                          <Text fontSize={10} fontFamily="$body" fontWeight="700" color="$green10">
                            DONE
                          </Text>
                        </XStack>
                      )}
                    </XStack>
                  </Card>
                )
              })}
            </YStack>

            {/* Help Card */}
            {canEdit && (
              <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
                <YStack gap="$2">
                  <XStack items="center" gap="$2">
                    <Target size={16} color="$primary" />
                    <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                      Schedule Control Tips
                    </Text>
                  </XStack>
                  <Text fontSize={13} fontFamily="$body" color="$color10">
                    Use "Swap" to reorder workouts within the week. Changes are synced to your
                    athlete's app in real-time. Use "Reset" to restore the original schedule.
                  </Text>
                </YStack>
              </Card>
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
