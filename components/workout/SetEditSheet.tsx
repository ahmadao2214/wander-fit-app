import { useState, useEffect } from 'react'
import {
  YStack,
  XStack,
  Text,
  Button,
  Input,
  Sheet,
  Slider,
  H3,
  Separator,
} from 'tamagui'
import { X, Check, Minus, Plus } from '@tamagui/lucide-icons'
import { parseReps } from '../../lib'

/**
 * SetEditSheet - Bottom sheet for editing set data
 *
 * Allows editing:
 * - Reps completed (number stepper)
 * - Weight used (optional number input)
 * - RPE 1-10 (slider)
 */

interface SetData {
  repsCompleted?: number
  weight?: number
  rpe?: number
  completed: boolean
  skipped: boolean
}

interface SetEditSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setNumber: number
  prescribedReps: string
  initialData: SetData
  onSave: (data: SetData) => void
}

export function SetEditSheet({
  open,
  onOpenChange,
  setNumber,
  prescribedReps,
  initialData,
  onSave,
}: SetEditSheetProps) {
  const [reps, setReps] = useState(initialData.repsCompleted || parseReps(prescribedReps))
  const [weight, setWeight] = useState(initialData.weight?.toString() || '')
  const [rpe, setRpe] = useState(initialData.rpe || 7)

  // Reset state when sheet opens with new data
  useEffect(() => {
    if (open) {
      setReps(initialData.repsCompleted || parseReps(prescribedReps))
      setWeight(initialData.weight?.toString() || '')
      setRpe(initialData.rpe || 7)
    }
  }, [open, initialData, prescribedReps])

  const handleSave = () => {
    onSave({
      repsCompleted: reps,
      weight: weight ? parseFloat(weight) : undefined,
      rpe,
      completed: true,
      skipped: false,
    })
    onOpenChange(false)
  }

  const handleSkip = () => {
    onSave({
      ...initialData,
      completed: false,
      skipped: true,
    })
    onOpenChange(false)
  }

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[55]}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay />
      <Sheet.Frame
        p="$4"
        bg="$background"
        maxWidth={400}
        alignSelf="center"
        width="100%"
      >
        <Sheet.Handle />

        <YStack gap="$4" pt="$2">
          {/* Header */}
          <XStack items="center" justify="space-between">
            <YStack>
              <H3 fontFamily="$body">Set {setNumber}</H3>
              <Text fontSize={13} fontFamily="$body" color="$color9">
                Prescribed: {prescribedReps} reps
              </Text>
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

          {/* Reps Stepper */}
          <YStack gap="$2">
            <Text fontFamily="$body" fontWeight="600" fontSize={14} color="$color11">
              Reps Completed
            </Text>
            <XStack items="center" justify="center" gap="$4">
              <Button
                size="$3"
                circular
                bg="$color4"
                icon={Minus}
                onPress={() => setReps(Math.max(0, reps - 1))}
              />
              <YStack width={50} items="center">
                <Text fontSize={32} fontFamily="$body" fontWeight="700" color="$color12">
                  {reps}
                </Text>
              </YStack>
              <Button
                size="$3"
                circular
                bg="$color4"
                icon={Plus}
                onPress={() => setReps(reps + 1)}
              />
            </XStack>
          </YStack>

          <Separator />

          {/* Weight Input */}
          <YStack gap="$2">
            <Text fontFamily="$body" fontWeight="600" fontSize={14} color="$color11">
              Weight (optional)
            </Text>
            <XStack items="center" gap="$2">
              <Input
                flex={1}
                size="$4"
                placeholder="0"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                fontFamily="$body"
              />
              <Text fontFamily="$body" color="$color9">lbs</Text>
            </XStack>
          </YStack>

          <Separator />

          {/* RPE Slider */}
          <YStack gap="$2">
            <XStack items="center" justify="space-between">
              <Text fontFamily="$body" fontWeight="600" fontSize={14} color="$color11">
                RPE
              </Text>
              <Text fontSize={18} fontFamily="$body" fontWeight="700" color="$green10">
                {rpe}/10
              </Text>
            </XStack>
            <Slider
              value={[rpe]}
              onValueChange={(val) => setRpe(val[0])}
              min={1}
              max={10}
              step={1}
            >
              <Slider.Track bg="$color4" height={6} rounded={3}>
                <Slider.TrackActive bg="$green9" />
              </Slider.Track>
              <Slider.Thumb
                index={0}
                size={24}
                bg="$green9"
                borderWidth={2}
                borderColor="white"
                circular
                elevate
              />
            </Slider>
            <XStack justify="space-between">
              <Text fontSize={11} fontFamily="$body" color="$color9">Easy</Text>
              <Text fontSize={11} fontFamily="$body" color="$color9">Max effort</Text>
            </XStack>
          </YStack>

          {/* Action Buttons */}
          <XStack gap="$3" pt="$2">
            <Button
              flex={1}
              size="$4"
              bg="$color3"
              color="$color11"
              fontFamily="$body"
              fontWeight="600"
              onPress={handleSkip}
            >
              Skip Set
            </Button>
            <Button
              flex={1}
              size="$4"
              bg="$green9"
              color="white"
              icon={Check}
              fontFamily="$body"
              fontWeight="600"
              onPress={handleSave}
            >
              Save
            </Button>
          </XStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}

export default SetEditSheet
