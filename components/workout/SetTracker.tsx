import { useState } from 'react'
import { YStack, XStack, Text, Card, styled } from 'tamagui'
import { Check, SkipForward } from '@tamagui/lucide-icons'
import { TouchableOpacity, Platform, Vibration } from 'react-native'
import { SetEditSheet } from './SetEditSheet'

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

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

interface SetTrackerProps {
  sets: SetData[]
  prescribedReps: string
  prescribedSets: number
  onSetUpdate: (setIndex: number, data: SetData) => void
  /** Intensity color for completed sets (from workout screen) */
  intensityColor?: `$${string}` | string
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
  intensityColor = '$success',
}: SetTrackerProps) {
  const [editingSetIndex, setEditingSetIndex] = useState<number | null>(null)

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
      // Quick complete with prescribed values
      onSetUpdate(index, {
        ...currentSet,
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

  return (
    <>
      <YStack gap="$3">
        <XStack justify="space-between" items="center">
          <SectionLabel>
            SETS
          </SectionLabel>
          <Text 
            fontSize={12} 
            color="$color10" 
            fontFamily="$body" fontWeight="500"
          >
            {sets.filter(s => s.completed).length} / {prescribedSets} completed
          </Text>
        </XStack>
        
        <XStack gap="$2" flexWrap="wrap" justify="center">
          {sets.map((set, index) => {
            const isCompleted = set.completed
            const isSkipped = set.skipped
            const isFirst = index === 0 && !sets.some(s => s.completed || s.skipped)

            return (
              <TouchableOpacity
                key={index}
                onPress={() => handlePress(index)}
                onLongPress={() => handleLongPress(index)}
                delayLongPress={400}
                activeOpacity={0.8}
                style={{ minWidth: 85, flex: 1 }}
              >
                <Card
                  p="$3"
                  bg={isCompleted ? '$intensityLow2' : isSkipped ? '$color4' : '$background'}
                  borderColor={isCompleted ? (intensityColor as any) : isSkipped ? '$borderColor' : '$borderColor'}
                  borderWidth={2}
                  rounded="$4"
                  opacity={isSkipped ? 0.6 : 1}
                  pressStyle={{ scale: 0.96 }}
                >
                  <YStack items="center" gap="$1.5">
                    <Text 
                      fontSize={11} 
                      fontFamily="$body" fontWeight="700"
                      letterSpacing={0.5}
                      color={isCompleted ? (intensityColor as any) : '$color10'}
                    >
                      SET {index + 1}
                    </Text>
                    
                    {isCompleted ? (
                      <XStack items="center" gap="$1">
                        <Check size={16} color={intensityColor as any} strokeWidth={3} />
                        {set.repsCompleted && (
                          <Text 
                            fontSize={16} 
                            color={intensityColor as any} 
                            fontFamily="$body" fontWeight="700"
                          >
                            {set.repsCompleted}
                          </Text>
                        )}
                        {set.weight && (
                          <Text 
                            fontSize={12} 
                            color="$color10"
                            fontFamily="$body"
                          >
                            @{set.weight}lb
                          </Text>
                        )}
                      </XStack>
                    ) : isSkipped ? (
                      <XStack items="center" gap="$1">
                        <SkipForward size={14} color="$color9" />
                        <Text 
                          fontSize={12} 
                          color="$color9"
                          fontFamily="$body"
                        >
                          Skipped
                        </Text>
                      </XStack>
                    ) : (
                      <Text 
                        fontSize={16} 
                        color="$color11"
                        fontFamily="$body" fontWeight="600"
                      >
                        {displayReps}
                      </Text>
                    )}
                    
                    {/* First set hint */}
                    {isFirst && (
                      <Text 
                        fontSize={10} 
                        color="$color9" 
                        fontFamily="$body"
                        mt="$0.5"
                      >
                        Tap to complete
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
