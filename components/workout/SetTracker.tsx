import { useState, useMemo } from 'react'
import { YStack, XStack, Text, Card, styled } from 'tamagui'
import { Check, SkipForward } from '@tamagui/lucide-icons'
import { TouchableOpacity, Platform, Vibration, type LayoutChangeEvent } from 'react-native'
import { SetEditSheet } from './SetEditSheet'
import { parseReps } from '../../lib'
import { nextSetIndex, setTileLayout } from '../../lib/workout'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const TILE_GAP = 8

const SectionLabel = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 12,
  color: '$color10',
})

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SetData {
  repsCompleted?: number
  durationSeconds?: number
  weight?: number
  rpe?: number
  completed: boolean
  skipped: boolean
}

/** Previous performance data for a single set */
interface PreviousSetData {
  repsCompleted?: number
  weight?: number
  completed: boolean
  skipped: boolean
}

interface SetTrackerProps {
  sets: SetData[]
  prescribedReps: string
  prescribedSets: number
  onSetUpdate: (setIndex: number, data: SetData) => void
  /** Primary intensity color for completed sets (e.g. $intensityMed6) */
  intensityColor?: `$${string}` | string
  /** Light intensity color for completed pill background (e.g. $intensityMed2) */
  intensityLightColor?: `$${string}` | string
  /** Previous performance data for comparison hints */
  previousSets?: PreviousSetData[]
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SetTracker - Horizontal set completion pills
 * 
 * - Tap to quick-complete (uses prescribed values)
 * - Long-press to edit (opens SetEditSheet)
 * - Uses intensity color when provided
 */
export function SetTracker({
  sets,
  prescribedReps,
  prescribedSets,
  onSetUpdate,
  intensityColor = '$primary',
  intensityLightColor = '$color3',
  previousSets,
}: SetTrackerProps) {
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null)
  const [rowWidth, setRowWidth] = useState(0)
  const activeIndex = nextSetIndex(sets)
  const { tileWidth } = setTileLayout(rowWidth, TILE_GAP)

  // Haptic feedback helper
  const triggerHaptic = () => {
    if (Platform.OS !== 'web') {
      Vibration.vibrate(10)
    }
  }

  // Handle tap - quick complete/toggle
  const handlePress = (index: number) => {
    triggerHaptic()
    const currentSet = sets[index]
    if (!currentSet.completed && !currentSet.skipped) {
      // Quick complete with prescribed reps value
      onSetUpdate(index, {
        ...currentSet,
        repsCompleted: parseReps(prescribedReps),
        completed: true,
        skipped: false,
      })
    } else if (currentSet.completed) {
      // Toggle off if already completed
      onSetUpdate(index, {
        ...currentSet,
        completed: false,
        skipped: false,
      })
    } else if (currentSet.skipped) {
      // If skipped, toggle to not skipped
      onSetUpdate(index, {
        ...currentSet,
        completed: false,
        skipped: false,
      })
    }
  }

  // Handle long press - open edit sheet
  const handleLongPress = (index: number) => {
    triggerHaptic()
    setEditingSetIndex(index)
  }

  const handleEditSave = (data: SetData) => {
    if (editingSetIndex !== null) {
      onSetUpdate(editingSetIndex, data)
      setEditingSetIndex(null)
    }
  }

  const displayReps = prescribedReps

  // Calculate previous performance summary
  const previousSummary = useMemo(() => {
    if (!previousSets || previousSets.length === 0) return null
    const completedPrevious = previousSets.filter(s => s.completed && !s.skipped)
    if (completedPrevious.length === 0) return null

    const maxWeight = Math.max(...completedPrevious.map(s => s.weight || 0))
    const maxReps = Math.max(...completedPrevious.map(s => s.repsCompleted || 0))

    return {
      sets: completedPrevious.length,
      maxWeight: maxWeight > 0 ? maxWeight : null,
      maxReps: maxReps > 0 ? maxReps : null,
    }
  }, [previousSets])

  return (
    <>
      <YStack gap="$3">
        <XStack items="center" gap="$2">
          <SectionLabel>SETS</SectionLabel>
          <Text testID="sets-logged" fontSize={12} color="$color9" fontFamily="$body">
            {sets.filter(s => s.completed).length}/{prescribedSets}
          </Text>
          {previousSummary && (
            <Text fontSize={11} color="$color9" fontFamily="$body" ml="auto">
              Last: {previousSummary.sets} sets
              {previousSummary.maxWeight ? ` @ ${previousSummary.maxWeight}lb` : ''}
              {previousSummary.maxReps ? ` x${previousSummary.maxReps}` : ''}
            </Text>
          )}
        </XStack>

        {/* Tiles are a third of the row (three across, centered); the next
            set to log is the one that stands out. */}
        <XStack
          flexWrap="wrap"
          justify="center"
          gap={TILE_GAP}
          onLayout={(event: LayoutChangeEvent) => setRowWidth(event.nativeEvent.layout.width)}
        >
          {sets.map((set, index) => {
            const isCompleted = set.completed
            const isSkipped = set.skipped
            const isNext = index === activeIndex
            const stateLabel = isCompleted ? 'done' : isSkipped ? 'skipped' : isNext ? 'next, tap when done' : 'to do'
            // A logged set announces what was logged; others announce the prescription
            const loggedWeight = set.weight != null && set.weight > 0 ? ` at ${set.weight} lb` : ''
            const valueLabel = isCompleted ? `${set.repsCompleted ?? displayReps}${loggedWeight}` : displayReps

            return (
              <TouchableOpacity
                key={index}
                testID={`set-${index}`}
                onPress={() => handlePress(index)}
                onLongPress={() => handleLongPress(index)}
                delayLongPress={400}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Set ${index + 1}, ${valueLabel}, ${stateLabel}`}
                style={{ width: tileWidth }}
              >
                <Card
                  testID={isNext ? 'set-tile-next' : undefined}
                  px="$3"
                  py={isNext ? '$3.5' : '$3'}
                  minH={isNext ? 84 : 72}
                  justify="center"
                  bg={isNext ? (intensityLightColor as any) : isCompleted ? '$color3' : isSkipped ? '$color4' : '$background'}
                  borderColor={isNext ? (intensityColor as any) : '$borderColor'}
                  borderWidth={isNext ? 2 : 1}
                  rounded="$4"
                >
                  <YStack items="center" gap="$1">
                    <Text
                      fontSize={12}
                      fontFamily="$body" fontWeight="700"
                      letterSpacing={0.5}
                      color={isNext ? '$color12' : '$color11'}
                    >
                      {isNext ? `SET ${index + 1} · NEXT` : `SET ${index + 1}`}
                    </Text>

                    {isCompleted ? (
                      // Weight goes on its own line so "12" and "225 lb" fit a third-width tile
                      <YStack items="center">
                        <XStack items="center" gap="$1">
                          <Check size={18} color={intensityColor as any} strokeWidth={3} />
                          {set.repsCompleted != null && (
                            <Text fontSize={18} color="$color12" fontFamily="$body" fontWeight="700">
                              {set.repsCompleted}
                            </Text>
                          )}
                        </XStack>
                        {set.weight != null && set.weight > 0 && (
                          <Text
                            testID={`set-${index}-weight`}
                            fontSize={13}
                            color="$color11"
                            fontFamily="$body"
                            numberOfLines={1}
                            adjustsFontSizeToFit
                          >
                            {set.weight} lb
                          </Text>
                        )}
                      </YStack>
                    ) : isSkipped ? (
                      <XStack items="center" gap="$1">
                        <SkipForward size={14} color="$color11" />
                        <Text fontSize={13} color="$color11" fontFamily="$body">
                          Skipped
                        </Text>
                      </XStack>
                    ) : (
                      <Text
                        fontSize={isNext ? 22 : 17}
                        color={isNext ? '$color12' : '$color11'}
                        fontFamily="$body" fontWeight={isNext ? '700' : '600'}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {displayReps}
                      </Text>
                    )}
                  </YStack>
                </Card>
              </TouchableOpacity>
            )
          })}
        </XStack>
      </YStack>

      {/* Edit Sheet */}
      {editingSetIndex !== null && (
        <SetEditSheet
          open={editingSetIndex !== null}
          onOpenChange={(open) => !open && setEditingSetIndex(null)}
          setNumber={editingSetIndex + 1}
          prescribedReps={prescribedReps}
          initialData={sets[editingSetIndex]}
          onSave={handleEditSave}
        />
      )}
    </>
  )
}

export default SetTracker
