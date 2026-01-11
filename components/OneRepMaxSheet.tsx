import { useState, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Input,
  Sheet,
  H3,
  Separator,
  Spinner,
} from 'tamagui'
import { X, Check, Dumbbell } from '@tamagui/lucide-icons'
import { useMutation } from 'convex/react'
import { api } from '../convex/_generated/api'

/**
 * OneRepMaxSheet - Bottom sheet for editing 1RM values
 *
 * Supports two modes:
 * - single: Edit a single exercise's 1RM (from profile or workout details)
 * - bulk: Edit multiple core lifts at once (currently unused, for future profile page)
 */

interface Exercise {
  _id: string
  name: string
  slug: string
  currentMax: number | null
}

interface OneRepMaxSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'single' | 'bulk'
  exercise?: Exercise // Required for single mode
  exercises?: Exercise[] // Required for bulk mode
  onComplete?: () => void
}

export function OneRepMaxSheet({
  open,
  onOpenChange,
  mode,
  exercise,
  exercises,
  onComplete,
}: OneRepMaxSheetProps) {
  const [weight, setWeight] = useState('')
  const [bulkWeights, setBulkWeights] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  const setMaxBySlug = useMutation(api.userMaxes.setMaxBySlug)
  const setMultipleMaxes = useMutation(api.userMaxes.setMultipleMaxes)

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      if (mode === 'single' && exercise) {
        setWeight(exercise.currentMax?.toString() || '')
      } else if (mode === 'bulk' && exercises) {
        const initial: Record<string, string> = {}
        for (const ex of exercises) {
          initial[ex.slug] = ex.currentMax?.toString() || ''
        }
        setBulkWeights(initial)
      }
    }
  }, [open, mode, exercise, exercises])

  const handleSaveSingle = async () => {
    if (!exercise) return

    const weightNum = parseFloat(weight)
    if (!weight || isNaN(weightNum) || weightNum <= 0) {
      // If empty or invalid, just close (don't save)
      onOpenChange(false)
      onComplete?.()
      return
    }

    setIsSaving(true)
    try {
      await setMaxBySlug({
        exerciseSlug: exercise.slug,
        oneRepMax: weightNum,
        source: 'user_input',
      })
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      console.error('Failed to save 1RM:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveBulk = async () => {
    if (!exercises) return

    const maxes = exercises.map((ex) => ({
      exerciseSlug: ex.slug,
      oneRepMax: parseFloat(bulkWeights[ex.slug] || '0') || 0,
    }))

    setIsSaving(true)
    try {
      await setMultipleMaxes({ maxes })
      onOpenChange(false)
      onComplete?.()
    } catch (error) {
      console.error('Failed to save 1RMs:', error)
      alert('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = mode === 'single' ? handleSaveSingle : handleSaveBulk

  // Snap points: taller for bulk mode
  const snapPoints = mode === 'bulk' ? [70] : [45]

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={snapPoints}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame
        p="$4"
        bg="$background"
        width="100%"
      >
        <Sheet.Handle />

        <YStack gap="$4" pt="$2">
          {/* Header */}
          <XStack items="center" justify="space-between">
            <YStack>
              <H3 fontFamily="$body">
                {mode === 'single' ? 'Set 1RM' : 'Set Your Maxes'}
              </H3>
              {mode === 'single' && exercise && (
                <Text fontSize={13} fontFamily="$body" color="$color9">
                  {exercise.name}
                </Text>
              )}
            </YStack>
            <Button
              size="$3"
              circular
              bg="$color3"
              icon={X}
              onPress={() => onOpenChange(false)}
            />
          </XStack>

          <Separator />

          {/* Single Mode: Weight Input */}
          {mode === 'single' && (
            <YStack gap="$2">
              <Text fontFamily="$body" fontWeight="600" fontSize={14} color="$color11">
                Max Weight
              </Text>
              <XStack items="center" gap="$2">
                <Input
                  flex={1}
                  size="$5"
                  placeholder="Enter weight"
                  keyboardType="numeric"
                  value={weight}
                  onChangeText={setWeight}
                  fontFamily="$body"
                  fontSize={18}
                />
                <Text fontFamily="$body" color="$color9" fontSize={16}>
                  lbs
                </Text>
              </XStack>
              <Text fontSize={12} fontFamily="$body" color="$color10" pt="$1">
                Your one rep max for this exercise
              </Text>
            </YStack>
          )}

          {/* Bulk Mode: Multiple Inputs */}
          {mode === 'bulk' && exercises && (
            <YStack gap="$4">
              {exercises.map((ex) => (
                <YStack key={ex.slug} gap="$2">
                  <XStack items="center" gap="$2">
                    <Dumbbell size={16} color="$color10" />
                    <Text fontFamily="$body" fontWeight="600" fontSize={14} color="$color11">
                      {ex.name}
                    </Text>
                  </XStack>
                  <XStack items="center" gap="$2">
                    <Input
                      flex={1}
                      size="$4"
                      placeholder="—"
                      keyboardType="numeric"
                      value={bulkWeights[ex.slug] || ''}
                      onChangeText={(text) =>
                        setBulkWeights((prev) => ({ ...prev, [ex.slug]: text }))
                      }
                      fontFamily="$body"
                    />
                    <Text fontFamily="$body" color="$color9">
                      lbs
                    </Text>
                  </XStack>
                </YStack>
              ))}
            </YStack>
          )}

          {/* Action Buttons */}
          <XStack gap="$3" pt="$2">
            <Button
              flex={1}
              size="$4"
              bg="$color3"
              color="$color11"
              fontFamily="$body"
              fontWeight="600"
              onPress={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              flex={2}
              size="$4"
              bg="$primary"
              color="white"
              icon={isSaving ? undefined : Check}
              fontFamily="$body"
              fontWeight="600"
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Spinner color="white" /> : 'Save'}
            </Button>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}

export default OneRepMaxSheet
