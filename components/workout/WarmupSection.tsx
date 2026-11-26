import React, { useState, useRef, useCallback, useEffect } from 'react'
import { ScrollView, View, StyleSheet, Pressable, type ScrollViewInstance } from 'react-native'
import { YStack, XStack, Text, Button, Card } from 'tamagui'
import { Display, SectionTitle, Body, Supporting, Caption } from '../Typography'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronDown, ChevronUp, ChevronLeft, Check } from '@tamagui/lucide-icons'
import type { WarmupPhase, ExerciseSection } from '../../types'
import type { Id } from '../../convex/_generated/dataModel'
import { WARMUP_PHASES } from '../../convex/warmupSequences'
import { warmupSummary } from '../../lib/workoutMeta'

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
  onBack?: () => void
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

/** Warmup exercises with no warmupPhase (older templates mark them by notes only). */
function ungroupedExercises(exercises: WarmupExercise[]): WarmupExercise[] {
  return exercises.filter((ex) => !ex.warmupPhase)
}

function ExerciseRows({ exercises, indent }: { exercises: WarmupExercise[]; indent?: boolean }) {
  return (
    <>
      {exercises.map((ex) => (
        <XStack key={ex.orderIndex} justify="space-between" items="center" pl={indent ? '$6' : 0}>
          <Supporting color="$color" flex={1} numberOfLines={1}>
            {ex.name}
          </Supporting>
          <Supporting color="$colorFocus" ml="$2">
            {ex.sets > 1 ? `${ex.sets} × ${ex.reps}` : ex.reps}
          </Supporting>
        </XStack>
      ))}
    </>
  )
}

function getPhaseDuration(phase: WarmupPhase): number {
  const config = WARMUP_PHASES.find(p => p.phase === phase)
  return config?.durationMin ?? 0
}

// ═══════════════════════════════════════════════════════════════════════════════
// PHASE CARD (Flow mode — with toggle)
// ═══════════════════════════════════════════════════════════════════════════════

function PhaseCard({ phase, exercises, phaseIndex, isCompleted, onToggle }: {
  phase: WarmupPhase
  exercises: WarmupExercise[]
  phaseIndex: number
  isCompleted?: boolean
  onToggle?: () => void
}) {

  return (
    <Card
      borderWidth={1}
      borderColor="$borderColor"
      bg={isCompleted ? "$color2" : "$background"}
      rounded="$4"
      p="$3"
      gap="$2"
      opacity={isCompleted ? 0.6 : 1}
    >
      <Pressable
        onPress={onToggle}
        testID={onToggle ? `phase-toggle-${phase}` : undefined}
      >
        <XStack items="center" gap="$2">
          <YStack
            width={28}
            height={28}
            rounded="$10"
            // The step badge is the words colour: no phase fill
            bg="$color"
            items="center"
            justify="center"
          >
            {isCompleted ? (
              <Check size={14} color="$background" />
            ) : (
              <Caption color="$background" fontWeight="700">
                {phaseIndex + 1}
              </Caption>
            )}
          </YStack>
          <Body
            fontWeight="600"
            color={isCompleted ? "$color10" : "$color"}
            flex={1}
            textDecorationLine={isCompleted ? "line-through" : "none"}
          >
            {PHASE_LABELS[phase]}
          </Body>
          {/* Tap affordance (right side) */}
          {isCompleted ? (
            <XStack items="center" gap="$1">
              <Check size={14} color="$color" />
              <Caption color="$color" fontWeight="600">Done</Caption>
            </XStack>
          ) : (
            <YStack
              testID={`phase-affordance-${phase}`}
              width={24}
              height={24}
              rounded={12}
              borderWidth={2}
              borderColor="$borderColor"
            />
          )}
        </XStack>
      </Pressable>
      {!isCompleted && <ExerciseRows exercises={exercises} indent />}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW MODE (Pre-execution full-screen)
// ═══════════════════════════════════════════════════════════════════════════════

function WarmupFlow({ exercises, totalDuration, onComplete, onBack }: Omit<WarmupSectionProps, 'mode'>) {
  const insets = useSafeAreaInsets()
  const phaseGroups = groupByPhase(exercises)
  const activePhases = PHASE_ORDER.filter((p) => phaseGroups.has(p))
  const ungrouped = ungroupedExercises(exercises)

  // Phase-level checklist state
  const [completedPhases, setCompletedPhases] = useState<Set<WarmupPhase>>(new Set())
  const scrollRef = useRef<ScrollViewInstance>(null)
  const phaseLayoutsRef = useRef<Map<WarmupPhase, number>>(new Map())
  const justToggledRef = useRef(false)

  const togglePhase = useCallback((phase: WarmupPhase) => {
    setCompletedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phase)) {
        next.delete(phase)
      } else {
        next.add(phase)
        justToggledRef.current = true
      }
      return next
    })
  }, [])

  // Auto-scroll to next unchecked phase only right after a toggle action
  useEffect(() => {
    if (!justToggledRef.current) return
    justToggledRef.current = false

    const nextUnchecked = activePhases.find(p => !completedPhases.has(p))
    if (!nextUnchecked) return
    const y = phaseLayoutsRef.current.get(nextUnchecked)
    if (y == null) return

    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: y - 16, animated: true })
    }, 100)
    return () => clearTimeout(timer)
  }, [completedPhases.size, activePhases])

  const completedCount = completedPhases.size
  const allComplete = activePhases.length > 0 && completedCount === activePhases.length
  const buttonLabel = allComplete
    ? "Let's Go!"
    : completedCount > 0
      ? `Start Workout (${completedCount}/${activePhases.length} complete)`
      : 'Start Workout'

  return (
    <YStack flex={1} bg="$background">
      {/* Header */}
      <YStack px="$4" pt={insets.top + 16} pb="$3" bg="$background">
        <XStack items="center" gap="$3">
          {/* Back button (left) */}
          {onBack ? (
            <Pressable
              testID="warmup-back-button"
              onPress={onBack}
              hitSlop={8}
            >
              <ChevronLeft size={28} color="$color" />
            </Pressable>
          ) : (
            <View style={{ width: 28 }} />
          )}

          {/* Title (left-aligned) */}
          {/* "WARMUP" stays in caps for the First Run Maestro flow, which asserts it */}
          <Display flex={1} accessibilityRole="header">
            WARMUP
          </Display>

          {/* Skip button (right) — hidden when all phases complete */}
          {!allComplete && (
            <Button
              size="$2"
              bg="$color3"
              color="$color11"
              fontWeight="600"
              rounded="$3"
              onPress={onComplete}
              testID="warmup-skip"
              pressStyle={{ opacity: 0.7 }}
            >
              Skip
            </Button>
          )}
        </XStack>
      </YStack>

      {/* Phase cards */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hint text */}
        {activePhases.length > 0 && (
          <Caption color="$color10" mb="$3">
            Tap each phase when complete
          </Caption>
        )}
        {ungrouped.length > 0 && (
          <Card borderWidth={1} borderColor="$borderColor" bg="$background" rounded="$4" p="$3" gap="$2" mb="$3">
            <ExerciseRows exercises={ungrouped} />
          </Card>
        )}
        {activePhases.map((phase, index) => (
          <YStack
            key={phase}
            mb="$3"
            onLayout={(e) => {
              phaseLayoutsRef.current.set(phase, e.nativeEvent.layout.y)
            }}
          >
            <PhaseCard
              phase={phase}
              exercises={phaseGroups.get(phase) || []}
              phaseIndex={index}
              isCompleted={completedPhases.has(phase)}
              onToggle={() => togglePhase(phase)}
            />
          </YStack>
        ))}
      </ScrollView>

      {/* Bottom bar — single button */}
      <View style={styles.bottomBar}>
        <YStack
          px="$4"
          pb={insets.bottom + 16}
          pt="$3"
          bg="$background"
        >
          <Button
            size="$5"
            bg="$primary"
            color="$background"
            fontSize={18}
            fontWeight="700"
            onPress={onComplete}
            icon={allComplete ? Check : undefined}
          >
            {buttonLabel}
          </Button>
        </YStack>
      </View>
    </YStack>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW MODE (Detail screen collapsible — compact phase summary)
// ═══════════════════════════════════════════════════════════════════════════════

function WarmupPreview({ exercises, totalDuration }: Pick<WarmupSectionProps, 'exercises' | 'totalDuration'>) {
  const [expanded, setExpanded] = useState(false)
  const phaseGroups = groupByPhase(exercises)
  const activePhases = PHASE_ORDER.filter((p) => phaseGroups.has(p))
  const ungrouped = ungroupedExercises(exercises)

  return (
    <Card borderColor="$borderColor" borderWidth={1} bg="$background" overflow="hidden">
      {/* Collapsible header */}
      <XStack
        items="center"
        justify="space-between"
        p="$3"
        pressStyle={{ opacity: 0.7 }}
        onPress={() => setExpanded(!expanded)}
      >
        <YStack>
          <SectionTitle accessibilityRole={undefined}>Warmup</SectionTitle>
          <Supporting color="$colorFocus">
            {warmupSummary({
              durationMin: totalDuration,
              phaseCount: activePhases.length,
              exerciseCount: exercises.length,
            })}
          </Supporting>
        </YStack>
        {expanded ? (
          <ChevronUp size={20} color="$colorFocus" />
        ) : (
          <ChevronDown size={20} color="$colorFocus" />
        )}
      </XStack>

      {/* Expanded content — compact phase summary rows */}
      {expanded && (
        <YStack px="$3" pb="$3" gap="$2">
          {ungrouped.length > 0 && <ExerciseRows exercises={ungrouped} />}
          {activePhases.map((phase, index) => {
            const phaseExercises = phaseGroups.get(phase) || []
            const duration = getPhaseDuration(phase)
            return (
              <XStack
                key={phase}
                items="center"
                gap="$2"
                py="$1.5"
                px="$2"
                bg="$backgroundHover"
                rounded="$3"
              >
                <YStack
                  width={22}
                  height={22}
                  rounded={11}
                  bg="$color"
                  items="center"
                  justify="center"
                >
                  <Caption color="$background" fontWeight="700">
                    {index + 1}
                  </Caption>
                </YStack>
                <Supporting fontWeight="600" color="$color" flex={1}>
                  {PHASE_LABELS[phase]}
                </Supporting>
                <Caption color="$colorFocus">
                  {phaseExercises.length} exercises · {duration} min
                </Caption>
              </XStack>
            )
          })}
        </YStack>
      )}
    </Card>
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
