import { YStack, XStack, Text, Card } from 'tamagui'
import { CheckCircle, Play, Clock } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'

/**
 * Phase colors for visual distinction
 */
const PHASE_COLORS: Record<Phase, { bg: string; border: string; dot: string }> = {
  GPP: { bg: '$blue2', border: '$blue6', dot: '$blue9' },
  SPP: { bg: '$orange2', border: '$orange6', dot: '$orange9' },
  SSP: { bg: '$green2', border: '$green6', dot: '$green9' },
}

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
  compact?: boolean
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
  compact = false,
  onPress,
  onLongPress,
}: CalendarWorkoutCardProps) {
  const colors = PHASE_COLORS[phase]

  // Determine card styling based on state
  const getBgColor = () => {
    if (isCompleted) return '$gray2'
    if (isInProgress) return '$green2'
    if (isToday) return colors.bg
    return '$background'
  }

  const getBorderColor = () => {
    if (isCompleted) return '$gray5'
    if (isInProgress) return '$green7'
    if (isToday) return colors.border
    return '$gray5'
  }

  if (compact) {
    // Compact mode for month view - just shows phase dot and status
    return (
      <Card
        pressStyle={{ opacity: 0.8, scale: 0.98 }}
        onPress={onPress}
        onLongPress={onLongPress}
        bg={getBgColor()}
        borderColor={getBorderColor()}
        borderWidth={1}
        px="$2"
        py="$1"
        rounded="$2"
      >
        <XStack items="center" gap="$1">
          <YStack
            width={6}
            height={6}
            rounded="$10"
            bg={colors.dot}
          />
          {isCompleted && <CheckCircle size={10} color="$gray9" />}
          {isInProgress && <Play size={10} color="$green9" />}
        </XStack>
      </Card>
    )
  }

  // Full card for week view
  return (
    <Card
      pressStyle={{ opacity: 0.8, scale: 0.98 }}
      onPress={onPress}
      onLongPress={onLongPress}
      bg={getBgColor()}
      borderColor={getBorderColor()}
      borderWidth={isToday || isInProgress ? 2 : 1}
      p="$2"
      rounded="$3"
      opacity={isCompleted ? 0.8 : 1}
    >
      <YStack gap="$1">
        {/* Phase indicator and status */}
        <XStack items="center" justify="space-between">
          <XStack items="center" gap="$1">
            <YStack
              width={8}
              height={8}
              rounded="$10"
              bg={colors.dot}
            />
            <Text fontSize={10} color="$color9" fontWeight="500">
              {phase}
            </Text>
          </XStack>
          {isCompleted && <CheckCircle size={12} color="$gray9" />}
          {isInProgress && <Play size={12} color="$green9" />}
          {isToday && !isCompleted && !isInProgress && (
            <Text fontSize={10} fontWeight="700" color={colors.dot}>
              TODAY
            </Text>
          )}
        </XStack>

        {/* Workout name */}
        <Text
          fontSize={12}
          fontWeight="600"
          color={isCompleted ? '$color10' : '$color12'}
          numberOfLines={2}
        >
          {name}
        </Text>

        {/* Meta info */}
        <XStack items="center" gap="$2">
          <Text fontSize={10} color="$color9">
            {exerciseCount} ex
          </Text>
          <XStack items="center" gap="$0.5">
            <Clock size={10} color="$color9" />
            <Text fontSize={10} color="$color9">
              {estimatedDurationMinutes}m
            </Text>
          </XStack>
        </XStack>
      </YStack>
    </Card>
  )
}
