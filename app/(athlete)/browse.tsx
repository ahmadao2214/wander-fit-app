import { useState } from 'react'
import { YStack, XStack, H2, Text, Card, Button, ScrollView, Spinner } from 'tamagui'
import { useQuery } from 'convex/react'
import { api } from 'convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useRouter } from 'expo-router'
import { 
  Lock,
  Unlock,
  ChevronRight,
  Dumbbell,
  Timer,
} from '@tamagui/lucide-icons'
import { PHASE_NAMES, type Phase } from '../../types'

/**
 * Phase descriptions - full names with context
 */
const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  GPP: 'General Physical Preparedness Phase - Build the foundation for your overall fitness, movement quality, and work capacity.',
  SPP: 'Sport Physical Preparedness Phase - Develop sport-specific movements and capacities that transfer to your sport demands.',
  SSP: 'Sport Specific Preparedness Phase - Final preparation to maintain fitness while peaking for your competitive season.',
}

/**
 * Browse Tab - Phase Browser
 * 
 * OPEN ACCESS: Athletes can freely choose ANY workout within unlocked phases.
 * No scheduled/suggested workouts - full flexibility.
 * 
 * SEQUENTIAL UNLOCK: GPP always unlocked, SPP unlocks after GPP completion,
 * SSP unlocks after SPP completion.
 */
export default function BrowsePage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [selectedPhase, setSelectedPhase] = useState<Phase>('GPP')

  // Get unlocked phases
  const unlockedPhases = useQuery(
    api.userPrograms.getUnlockedPhases,
    user ? {} : "skip"
  )

  // Get current program state for context
  const programState = useQuery(
    api.userPrograms.getCurrentProgramState,
    user ? {} : "skip"
  )

  // Get phase overview for selected phase
  const phaseOverview = useQuery(
    api.programTemplates.getPhaseOverview,
    programState && unlockedPhases?.phases.includes(selectedPhase as "GPP" | "SPP" | "SSP") ? {
      gppCategoryId: programState.gppCategoryId,
      phase: selectedPhase as "GPP" | "SPP" | "SSP",
      skillLevel: programState.skillLevel,
    } : "skip"
  )

  if (authLoading || !unlockedPhases) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$green10" />
        <Text>Loading training block...</Text>
      </YStack>
    )
  }

  const phases: Phase[] = ['GPP', 'SPP', 'SSP']
  const isPhaseUnlocked = (phase) => 
    unlockedPhases.phases.includes(phase)

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
          <YStack gap="$1">
            <H2>Training Block</H2>
            <Text color="$color11">
              Browse all workouts in your program
            </Text>
          </YStack>

          {/* Phase Tabs */}
          <XStack gap="$2">
            {phases.map((phase) => {
              const unlocked = isPhaseUnlocked(phase)
              const isSelected = selectedPhase === phase
              
              return (
                <Button
                  key={phase}
                  flex={1}
                  size="$4"
                  bg={isSelected ? (unlocked ? '$green9' : '$gray6') : '$gray3'}
                  color={isSelected ? 'white' : (unlocked ? '$gray12' : '$gray9')}
                  borderColor={unlocked ? '$green7' : '$gray6'}
                  borderWidth={1}
                  opacity={unlocked ? 1 : 0.6}
                  icon={unlocked ? Unlock : Lock}
                  onPress={() => unlocked && setSelectedPhase(phase)}
                  disabled={!unlocked}
                >
                  {phase}
                </Button>
              )
            })}
          </XStack>

          {/* Phase Description */}
          <Card p="$4" bg="$gray2" borderColor="$gray6">
            <YStack gap="$2">
              <Text fontSize="$4" fontWeight="600">
                {PHASE_NAMES[selectedPhase]}
              </Text>
              <Text fontSize="$3" color="$color11">
                {PHASE_DESCRIPTIONS[selectedPhase]}
              </Text>
              {!isPhaseUnlocked(selectedPhase) && (
                <XStack items="center" gap="$2" pt="$2">
                  <Lock size={16} color="orange" />
                  <Text fontSize="$2" color="orange">
                    Complete {selectedPhase === 'SPP' ? 'GPP' : 'SPP'} to unlock this phase
                  </Text>
                </XStack>
              )}
            </YStack>
          </Card>

          {/* Weeks */}
          {isPhaseUnlocked(selectedPhase) && phaseOverview && (
            <YStack gap="$4">
              {phaseOverview.map(({ week, workouts }) => (
                <YStack key={week} gap="$3">
                  <Text fontSize="$5" fontWeight="600" color={"$gray12" as any}>
                    Week {week}
                  </Text>
                  
                  <YStack gap="$2">
                    {workouts.map((workout) => (
                      <Card
                        key={workout._id}
                        p="$4"
                        bg="$background"
                        borderColor={"$gray6" as any}
                        borderWidth={1}
                        pressStyle={{ scale: 0.98, opacity: 0.9 }}
                        onPress={() => router.push(`/(athlete)/workout/${workout._id}`)}
                      >
                        <XStack items="center" gap="$3">
                          <YStack flex={1} gap="$1">
                            <Text fontSize="$2" color="$color10" fontWeight="500">
                              DAY {workout.day}
                            </Text>
                            <Text fontSize="$4" fontWeight="600">
                              {workout.name}
                            </Text>
                            <XStack gap="$3">
                              <XStack items="center" gap="$1">
                                <Dumbbell size={14} color="$color10" />
                                <Text fontSize="$2" color="$color10">
                                  {workout.exercises.length} exercises
                                </Text>
                              </XStack>
                              <XStack items="center" gap="$1">
                                <Timer size={14} color="$color10" />
                                <Text fontSize="$2" color="$color10">
                                  ~{workout.estimatedDurationMinutes} min
                                </Text>
                              </XStack>
                            </XStack>
                          </YStack>
                          <ChevronRight size={20} color="$gray8" />
                        </XStack>
                      </Card>
                    ))}
                  </YStack>
                </YStack>
              ))}

              {phaseOverview.length === 0 && (
                <Card p="$6" bg="$gray2">
                  <YStack items="center" gap="$2">
                    <Dumbbell size={32} color="$gray8" />
                    <Text color="$color10" textAlign="center">
                      No workouts found for this phase.
                    </Text>
                  </YStack>
                </Card>
              )}
            </YStack>
          )}

          {/* Locked Phase Message */}
          {!isPhaseUnlocked(selectedPhase) && (
            <Card p="$6" bg="$gray2" borderColor="$gray6">
              <YStack items="center" gap="$3">
                <Lock size={48} color="$gray8" />
                <Text fontSize="$4" fontWeight="600" color="$color11">
                  Phase Locked
                </Text>
                <Text color="$color10" textAlign="center">
                  Complete the previous phase to unlock {PHASE_NAMES[selectedPhase]}.
                </Text>
              </YStack>
            </Card>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  )
}
