import React, { useState } from 'react'
import { ScrollView, View, StyleSheet } from 'react-native'
import { YStack, XStack, Text, Button } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons'
import type { WarmupPhase, ExerciseSection } from '../../types'
import type { Id } from '../../convex/_generated/dataModel'

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WarmupExercise {
  exerciseId: Id<"exercises">
  name: string
  sets: number
  reps: string
  restSeconds: number
  warmupPhase?: WarmupPhase
  section?: ExerciseSection
  orderIndex: number
}

interface WarmupSectionProps {
  exercises: WarmupExercise[]
  totalDuration: number
  onComplete: () => void
  onSkip: () => void
  mode: "preview" | "flow"
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE LABELS
// ═══════════════════════════════════════════════════════════════════════════════

const PHASE_LABELS: Record<WarmupPhase, string> = {
  foam_rolling: "Foam Rolling",
  mobility: "Mobility",
  core_isometric: "Core Isometric",
  core_dynamic: "Core Dynamic",
  walking_drills: "Walking Drills",
  movement_prep: "Movement Prep",
  power_primer: "Power Primer",
}

const PHASE_ORDER: WarmupPhase[] = [
  "foam_rolling",
  "mobility",
  "core_isometric",
  "core_dynamic",
  "walking_drills",
  "movement_prep",
  "power_primer",
]

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function groupByPhase(exercises: WarmupExercise[]): Map<WarmupPhase, WarmupExercise[]> {
  const groups = new Map<WarmupPhase, WarmupExercise[]>()
  for (const ex of exercises) {
    if (!ex.warmupPhase) continue
    const group = groups.get(ex.warmupPhase)
    if (group) {
      group.push(ex)
    } else {
      groups.set(ex.warmupPhase, [ex])
    }
  }
  return groups
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CARD
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseCard({ phase, exercises, phaseIndex }: {
  phase: WarmupPhase
  exercises: WarmupExercise[]
  phaseIndex: number
}) {
  return (
    <YStack
      bg="$backgroundHover"
      rounded="$4"
      p="$3"
      gap="$2"
    >
      <XStack items="center" gap="$2">
        <YStack
          width={24}
          height={24}
          rounded={12}
          bg="$primary"
          items="center"
          justify="center"
        >
          <Text color="white" fontSize={12} fontWeight="700">
            {phaseIndex + 1}
          </Text>
        </YStack>
        <Text fontSize={15} fontWeight="600" color="$color">
          {PHASE_LABELS[phase]}
        </Text>
      </XStack>
      {exercises.map((ex) => (
        <XStack key={ex.orderIndex} justify="space-between" items="center" pl="$6">
          <Text fontSize={14} color="$color" flex={1} numberOfLines={1}>
            {ex.name}
          </Text>
          <Text fontSize={13} color="$colorFocus" ml="$2">
            {ex.sets > 1 ? `${ex.sets} × ${ex.reps}` : ex.reps}
          </Text>
        </XStack>
      ))}
    </YStack>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW MODE (Pre-execution full-screen)
// ═══════════════════════════════════════════════════════════════════════════════

function WarmupFlow({ exercises, totalDuration, onComplete, onSkip }: Omit<WarmupSectionProps, 'mode'>) {
  const insets = useSafeAreaInsets()
  const phaseGroups = groupByPhase(exercises)
  const activePhases = PHASE_ORDER.filter((p) => phaseGroups.has(p))

  return (
    <YStack flex={1} bg="$background">
      {/* Header */}
      <YStack px="$4" pt={insets.top + 16} pb="$3" bg="$background">
        <Text fontSize={28} fontWeight="800" color="$color">
          Warmup
        </Text>
        <XStack gap="$3" items="center" mt="$1">
          <Text fontSize={14} color="$colorFocus">
            ~{totalDuration} min
          </Text>
          <Text fontSize={14} color="$colorFocus">
            {activePhases.length} phases
          </Text>
          <Text fontSize={14} color="$colorFocus">
            {exercises.length} exercises
          </Text>
        </XStack>
        {activePhases.length > 0 && (
          <Text fontSize={13} color="$colorFocus" mt="$2" numberOfLines={1}>
            {activePhases.map((p) => PHASE_LABELS[p]).join(' → ')}
          </Text>
        )}
      </YStack>

      {/* Phase cards */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {activePhases.map((phase, index) => (
          <YStack key={phase} mb="$3">
            <PhaseCard
              phase={phase}
              exercises={phaseGroups.get(phase) || []}
              phaseIndex={index}
            />
          </YStack>
        ))}
      </ScrollView>

      {/* Bottom bar */}
      <View style={styles.bottomBar}>
        <YStack
          px="$4"
          pb={insets.bottom + 16}
          pt="$3"
          bg="$background"
          borderTopWidth={1}
          borderColor="$borderColor"
          gap="$2"
        >
          <Button
            size="$5"
            bg="$primary"
            color="white"
            fontWeight="700"
            onPress={onComplete}
          >
            Start Workout
          </Button>
          <Button
            size="$3"
            chromeless
            color="$colorFocus"
            onPress={onSkip}
          >
            Skip Warmup
          </Button>
        </YStack>
      </View>
    </YStack>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW MODE (Detail screen collapsible)
// ═══════════════════════════════════════════════════════════════════════════════

function WarmupPreview({ exercises, totalDuration }: Pick<WarmupSectionProps, 'exercises' | 'totalDuration'>) {
  const [expanded, setExpanded] = useState(false)
  const phaseGroups = groupByPhase(exercises)
  const activePhases = PHASE_ORDER.filter((p) => phaseGroups.has(p))

  return (
    <YStack bg="$backgroundHover" rounded="$4" overflow="hidden">
      {/* Collapsible header */}
      <XStack
        items="center"
        justify="space-between"
        p="$3"
        pressStyle={{ opacity: 0.7 }}
        onPress={() => setExpanded(!expanded)}
      >
        <YStack>
          <Text fontSize={16} fontWeight="700" color="$color">
            Warmup
          </Text>
          <Text fontSize={13} color="$colorFocus">
            ~{totalDuration} min · {activePhases.length} phases · {exercises.length} exercises
          </Text>
        </YStack>
        {expanded ? (
          <ChevronUp size={20} color="$colorFocus" />
        ) : (
          <ChevronDown size={20} color="$colorFocus" />
        )}
      </XStack>

      {/* Expanded content */}
      {expanded && (
        <YStack px="$3" pb="$3" gap="$2">
          {activePhases.map((phase, index) => (
            <PhaseCard
              key={phase}
              phase={phase}
              exercises={phaseGroups.get(phase) || []}
              phaseIndex={index}
            />
          ))}
        </YStack>
      )}
    </YStack>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function WarmupSection(props: WarmupSectionProps) {
  if (props.mode === "preview") {
    return <WarmupPreview {...props} />
  }
  return <WarmupFlow {...props} />
}

const styles = StyleSheet.create({
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
})

export default WarmupSection
