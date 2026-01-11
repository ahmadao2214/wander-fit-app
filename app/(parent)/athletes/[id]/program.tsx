import { YStack, XStack, Text, Card, Button, ScrollView, Spinner, styled } from 'tamagui'
import { useQuery } from 'convex/react'
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export default function AthleteProgramScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()

  // Get athlete details
  const athlete = useQuery(
    api.parentRelationships.getAthleteDetails,
    id ? { athleteId: id as Id<"users"> } : "skip"
  )

  // Loading state
  if (athlete === undefined) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
          <Spinner size="large" color="$primary" />
          <Text color="$color10" fontFamily="$body">Loading program...</Text>
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
            {/* View Mode Banner */}
            <Card p="$3" bg="$brand1" rounded="$3">
              <XStack items="center" gap="$2">
                <Eye size={16} color="$primary" />
                <Text fontSize={13} fontFamily="$body" color="$primary">
                  Viewing as parent (read-only)
                </Text>
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
                        <Text
                          fontSize={14}
                          fontFamily="$body"
                          fontWeight="700"
                          color="white"
                        >
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

            {/* Info Card */}
            <Card p="$4" bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor">
              <YStack gap="$2">
                <XStack items="center" gap="$2">
                  <Clock size={16} color="$color10" />
                  <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
                    Coming Soon
                  </Text>
                </XStack>
                <Text fontSize={13} fontFamily="$body" color="$color10">
                  The ability to view detailed workouts and modify your athlete's schedule will be available in a future update.
                </Text>
              </YStack>
            </Card>
          </YStack>
        </ScrollView>
      </YStack>
    </>
  )
}
