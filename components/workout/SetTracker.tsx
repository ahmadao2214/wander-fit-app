import { useState } from 'react'
import { YStack, XStack, Text, Card } from 'tamagui'
import { Check, SkipForward } from '@tamagui/lucide-icons'
import { TouchableOpacity, Platform, Vibration } from 'react-native'
import { SetEditSheet } from './SetEditSheet'

/**
 * SetTracker - Horizontal set completion pills
 * 
 * - Tap to quick-complete (uses prescribed values)
 * - Long-press to edit (opens SetEditSheet)
 */

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
}

export function SetTracker({
  sets,
  prescribedReps,
  prescribedSets,
  onSetUpdate,
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

  // Parse reps for display (e.g., "10-12" -> "10-12", "10" -> "10")
  const displayReps = prescribedReps

  return (
    <>
      <YStack gap="$2">
        <Text fontSize="$2" color="$color10" fontWeight="600">
          Sets ({sets.filter(s => s.completed).length}/{prescribedSets} completed)
        </Text>
        
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
                activeOpacity={0.7}
                style={{ minWidth: 80 }}
              >
                <Card
                  p="$3"
                  bg={isCompleted ? '$green3' : isSkipped ? '$gray3' : '$background'}
                  borderColor={isCompleted ? '$green8' : isSkipped ? '$gray6' : '$gray6'}
                  borderWidth={2}
                  borderRadius="$3"
                  opacity={isSkipped ? 0.6 : 1}
                >
                  <YStack items="center" gap="$1">
                    <Text 
                      fontSize="$2" 
                      color={isCompleted ? '$green11' : '$color10'}
                      fontWeight="600"
                    >
                      Set {index + 1}
                    </Text>
                    
                    {isCompleted ? (
                      <XStack items="center" gap="$1">
                        <Check size={16} color="$green10" />
                        {set.repsCompleted && (
                          <Text fontSize="$3" color="$green11" fontWeight="700">
                            {set.repsCompleted}
                          </Text>
                        )}
                        {set.weight && (
                          <Text fontSize="$2" color="$green10">
                            @{set.weight}lb
                          </Text>
                        )}
                      </XStack>
                    ) : isSkipped ? (
                      <XStack items="center" gap="$1">
                        <SkipForward size={14} color="$gray10" />
                        <Text fontSize="$2" color="$gray10">
                          Skipped
                        </Text>
                      </XStack>
                    ) : (
                      <Text 
                        fontSize="$3" 
                        color="$color10"
                      >
                        {displayReps}
                      </Text>
                    )}
                    
                    {/* First set hint */}
                    {isFirst && (
                      <Text fontSize="$1" color="$color9" mt="$1">
                        Tap
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
