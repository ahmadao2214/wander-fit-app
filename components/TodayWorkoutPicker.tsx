import { useState } from 'react'
import {
  YStack,
  XStack,
  Text,
  Card,
  Button,
  ScrollView,
  Sheet,
  Spinner,
} from 'tamagui'
import { useQuery, useMutation } from 'convex/react'
import { api } from 'convex/_generated/api'
import { Check, Dumbbell, Timer, X } from '@tamagui/lucide-icons'
import type { Id } from 'convex/_generated/dataModel'

interface TodayWorkoutPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPhase?: string
  currentWeek?: number
}

/**
 * TodayWorkoutPicker - Modal for selecting a different workout to focus on today
 * 
 * Shows all workouts in the current phase, with current week workouts first.
 * User can select any workout to set as today's focus.
 */
export function TodayWorkoutPicker({
  open,
  onOpenChange,
  currentPhase,
  currentWeek,
}: TodayWorkoutPickerProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<Id<'program_templates'> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Get current program state
  const programState = useQuery(api.userPrograms.getCurrentProgramState, {})

  // Get phase overview to show all available workouts
  const phaseOverview = useQuery(
    api.programTemplates.getPhaseOverview,
    programState
      ? {
          gppCategoryId: programState.gppCategoryId,
          phase: programState.phase as 'GPP' | 'SPP' | 'SSP',
          skillLevel: programState.skillLevel as 'Novice' | 'Moderate' | 'Advanced',
        }
      : 'skip'
  )

  // Get current schedule override to know what's currently selected
  const scheduleOverride = useQuery(api.scheduleOverrides.getScheduleOverride, {})

  const setTodayFocus = useMutation(api.scheduleOverrides.setTodayFocus)
  const clearTodayFocus = useMutation(api.scheduleOverrides.clearTodayFocus)

  const handleConfirm = async () => {
    if (!selectedTemplateId) return

    setIsSubmitting(true)
    try {
      await setTodayFocus({ templateId: selectedTemplateId })
      onOpenChange(false)
      setSelectedTemplateId(null)
    } catch (error) {
      console.error('Failed to set today focus:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClearOverride = async () => {
    setIsSubmitting(true)
    try {
      await clearTodayFocus({})
      onOpenChange(false)
      setSelectedTemplateId(null)
    } catch (error) {
      console.error('Failed to clear today focus:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Sort weeks so current week is first
  const sortedWeeks = phaseOverview
    ? [...phaseOverview].sort((a, b) => {
        if (a.week === currentWeek) return -1
        if (b.week === currentWeek) return 1
        return a.week - b.week
      })
    : []

  const currentFocusId = scheduleOverride?.todayFocusTemplateId

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={onOpenChange}
      snapPoints={[85]}
      dismissOnSnapToBottom
      zIndex={100000}
    >
      <Sheet.Overlay />
      <Sheet.Frame bg="$background" borderTopLeftRadius="$6" borderTopRightRadius="$6">
        <Sheet.Handle />
        
        <YStack flex={1} p="$4" gap="$4">
          {/* Header */}
          <XStack justify="space-between" items="center">
            <YStack>
              <Text fontSize="$6" fontWeight="700">
                Select Today's Workout
              </Text>
              <Text fontSize="$3" color="$gray11">
                Choose which workout to focus on today
              </Text>
            </YStack>
            <Button
              size="$3"
              circular
              chromeless
              icon={<X size={20} />}
              onPress={() => onOpenChange(false)}
            />
          </XStack>

          {/* Clear Override Button (if there's an active override) */}
          {currentFocusId && (
            <Button
              size="$3"
              variant="outlined"
              borderColor="$gray6"
              onPress={handleClearOverride}
              disabled={isSubmitting}
            >
              <Text color="$gray11">Reset to Scheduled Workout</Text>
            </Button>
          )}

          {/* Workout List */}
          <ScrollView flex={1} showsVerticalScrollIndicator={false}>
            {!phaseOverview ? (
              <YStack flex={1} items="center" justify="center" py="$8">
                <Spinner size="large" color="$green10" />
              </YStack>
            ) : (
              <YStack gap="$4" pb="$4">
                {sortedWeeks.map(({ week, workouts }) => (
                  <YStack key={week} gap="$2">
                    <XStack items="center" gap="$2">
                      <Text fontSize="$4" fontWeight="600" color="$gray12">
                        Week {week}
                      </Text>
                      {week === currentWeek && (
                        <Card bg="$green9" px="$2" py="$0.5" borderRadius="$10">
                          <Text color="white" fontSize="$1" fontWeight="600">
                            Current
                          </Text>
                        </Card>
                      )}
                    </XStack>

                    <YStack gap="$2">
                      {workouts.map((workout) => {
                        const isSelected = selectedTemplateId === workout._id
                        const isCurrentFocus = currentFocusId === workout._id

                        return (
                          <Card
                            key={workout._id}
                            p="$3"
                            bg={isSelected ? '$green3' : '$background'}
                            borderColor={isSelected ? '$green8' : isCurrentFocus ? '$blue7' : '$gray6'}
                            borderWidth={isSelected || isCurrentFocus ? 2 : 1}
                            pressStyle={{ scale: 0.98, opacity: 0.9 }}
                            onPress={() => setSelectedTemplateId(workout._id)}
                          >
                            <XStack items="center" gap="$3">
                              <YStack flex={1} gap="$1">
                                <XStack items="center" gap="$2">
                                  <Text fontSize="$2" color="$gray10" fontWeight="500">
                                    DAY {workout.day}
                                  </Text>
                                  {isCurrentFocus && (
                                    <Card bg="$blue9" px="$2" py="$0.5" borderRadius="$10">
                                      <Text color="white" fontSize="$1" fontWeight="600">
                                        Current Focus
                                      </Text>
                                    </Card>
                                  )}
                                </XStack>
                                <Text fontSize="$4" fontWeight="600">
                                  {workout.name}
                                </Text>
                                <XStack gap="$3">
                                  <XStack items="center" gap="$1">
                                    <Dumbbell size={12} color="$gray10" />
                                    <Text fontSize="$2" color="$gray10">
                                      {workout.exercises.length} exercises
                                    </Text>
                                  </XStack>
                                  <XStack items="center" gap="$1">
                                    <Timer size={12} color="$gray10" />
                                    <Text fontSize="$2" color="$gray10">
                                      ~{workout.estimatedDurationMinutes} min
                                    </Text>
                                  </XStack>
                                </XStack>
                              </YStack>

                              {isSelected && (
                                <Check size={24} color="$green10" />
                              )}
                            </XStack>
                          </Card>
                        )
                      })}
                    </YStack>
                  </YStack>
                ))}
              </YStack>
            )}
          </ScrollView>

          {/* Confirm Button */}
          <Button
            size="$5"
            bg={selectedTemplateId ? '$green9' : '$gray6'}
            color="white"
            fontWeight="700"
            onPress={handleConfirm}
            disabled={!selectedTemplateId || isSubmitting}
          >
            {isSubmitting ? 'Setting...' : 'Confirm Selection'}
          </Button>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  )
}


