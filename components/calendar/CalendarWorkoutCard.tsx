import { YStack, XStack, Text, Card, type ColorTokens } from 'tamagui'
import { Caption } from '../Typography'
import { CheckCircle, Play, Lock } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'
import { phaseTokens } from '../../lib/phase'


export interface CalendarWorkoutCardProps {
  templateId: string
  name: string
  phase: Phase
  week: number
  day: number
  exerciseCount: number
  estimatedDurationMinutes: number
  isCompleted: boolean
  isToday: boolean
  isInProgress: boolean
  isLocked?: boolean // Phase not yet unlocked (visible but not draggable)
  compact?: boolean
  gppCategoryId?: number // Category ID (not used for coloring, kept for data)
  exercisePreview?: string[] // First 3 exercise names for preview
  onPress?: () => void
  onLongPress?: () => void
}

/**
 * CalendarWorkoutCard - Workout card for calendar view
 *
 * Displays workout info with phase color coding.
 * Supports compact mode for month view.
 */
export function CalendarWorkoutCard({
  name,
  phase,
  week,
  day,
  exerciseCount,
  estimatedDurationMinutes,
  isCompleted,
  isToday,
  isInProgress,
  isLocked = false,
  compact = false,
  gppCategoryId,
  exercisePreview = [],
  onPress,
  onLongPress,
}: CalendarWorkoutCardProps) {
  // Use phase colors for visual distinction
  const colors = { dot: phaseTokens(phase).fill }

  // One neutral surface for every card. Phase is the left stripe; today is
  // the border; in progress, done and locked are the icon (and dimming).
  const isActive = !isLocked && !isCompleted && isToday
  const getBgColor = (): ColorTokens => (isLocked || isCompleted ? '$gray2' : '$background')
  const getBorderColor = (): ColorTokens => (isActive ? '$primary' : '$gray5')

  // Determine status icon
  const getStatusIcon = () => {
    if (isLocked) return <Lock size={10} color="$color10" />
    if (isCompleted) return <CheckCircle size={10} color="$color10" />
    if (isInProgress) return <Play size={10} color="$primaryText" />
    return null
  }

  const stateLabel = isLocked
    ? 'locked'
    : isCompleted
      ? 'done'
      : isInProgress
        ? 'in progress'
        : isToday
          ? 'today'
          : null
  // Phase is shown by color, so screen readers get it in words
  const accessibilityLabel = [`${phase} workout`, name, `about ${estimatedDurationMinutes} minutes`, stateLabel]
    .filter(Boolean)
    .join(', ')

  if (compact) {
    // Compact mode for month view - shows title and status, phase as the left stripe
    return (
      <Card
        pressStyle={isLocked ? undefined : { opacity: 0.8, scale: 0.98 }}
        onPress={isLocked ? undefined : onPress}
        onLongPress={isLocked ? undefined : onLongPress}
        accessibilityLabel={accessibilityLabel}
        bg={getBgColor()}
        borderColor={getBorderColor()}
        borderWidth={1}
        borderLeftWidth={3}
        borderLeftColor={isLocked ? '$gray6' : colors.dot}
        rounded="$1"
        opacity={isLocked ? 0.5 : isCompleted ? 0.7 : 1}
        overflow="hidden"
        padding={0}
      >
        <XStack items="center" gap="$1" px="$1" py="$0.5">
          <Text
            fontSize={12}
            lineHeight={16}
            fontWeight="500"
            color={isLocked || isCompleted ? '$color9' : '$color11'}
            numberOfLines={1}
            flex={1}
          >
            {name}
          </Text>
          {getStatusIcon()}
        </XStack>
      </Card>
    )
  }

  // Calculate remaining exercises for "+N more" text
  const remainingExercises = exerciseCount - exercisePreview.length

  return (
    <Card
      pressStyle={isLocked ? undefined : { opacity: 0.8, scale: 0.98 }}
      onPress={isLocked ? undefined : onPress}
      onLongPress={isLocked ? undefined : onLongPress}
      accessibilityLabel={accessibilityLabel}
      backgroundColor={getBgColor()}
      borderColor={getBorderColor()}
      borderWidth={isActive ? 2 : 1}
      borderLeftWidth={3}
      borderLeftColor={isLocked ? '$gray6' : colors.dot}
      borderRadius="$3"
      opacity={isLocked ? 0.5 : isCompleted ? 0.7 : 1}
      overflow="hidden"
      padding={0}
    >
      <YStack gap="$1.5" px="$2" py="$1.5">
        {/* Duration and status icon */}
        <XStack items="center" justify="space-between">
          <Caption fontWeight="600">~{estimatedDurationMinutes}m</Caption>
          {getStatusIcon()}
        </XStack>

        {/* Workout name */}
        <Text
          fontSize={12}
          fontWeight="600"
          lineHeight={16}
          color={isLocked || isCompleted ? '$color10' : '$color12'}
          numberOfLines={2}
          // @ts-ignore - Android prop to prevent mid-word breaks
          textBreakStrategy="simple"
        >
          {name}
        </Text>

        {/* Exercise preview list - no bullets to save space */}
        {exercisePreview.length > 0 && (
          <YStack gap="$0.5" pt="$1" borderTopWidth={1} borderTopColor="$gray4">
            {exercisePreview.map((exerciseName, idx) => (
              <Text
                key={idx}
                fontSize={12}
                lineHeight={16}
                color="$color10"
                numberOfLines={1}
              >
                {exerciseName}
              </Text>
            ))}
            {remainingExercises > 0 && (
              <Caption>+{remainingExercises} more</Caption>
            )}
          </YStack>
        )}
      </YStack>
    </Card>
  )
}
