import { YStack, XStack, Text, Card } from 'tamagui'
import { CheckCircle, Play, Clock, Lock } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'

/**
 * Phase colors for visual distinction
 * GPP = Blue (foundation phase)
 * SPP = Orange (sport-specific phase)
 * SSP = Green (competition prep phase)
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
  isLocked?: boolean // Phase not yet unlocked (visible but not draggable)
  compact?: boolean
  gppCategoryId?: number // Category ID (not used for coloring, kept for data)
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
  onPress,
  onLongPress,
}: CalendarWorkoutCardProps) {
  // Use phase colors for visual distinction
  const colors = PHASE_COLORS[phase]

  // Determine card styling based on state
  const getBgColor = () => {
    if (isLocked) return '$gray2'
    if (isCompleted) return '$gray2'
    if (isInProgress) return '$green2'
    if (isToday) return colors.bg
    return '$background'
  }

  const getBorderColor = () => {
    if (isLocked) return '$gray4'
    if (isCompleted) return '$gray5'
    if (isInProgress) return '$green7'
    if (isToday) return colors.border
    return '$gray5'
  }

  // Determine status icon
  const getStatusIcon = () => {
    if (isLocked) return <Lock size={10} color="$gray8" />
    if (isCompleted) return <CheckCircle size={10} color="$gray9" />
    if (isInProgress) return <Play size={10} color="$green9" />
    return null
  }

  if (compact) {
    // Compact mode for month view - shows phase dot, title, and status
    return (
      <Card
        pressStyle={isLocked ? undefined : { opacity: 0.8, scale: 0.98 }}
        onPress={isLocked ? undefined : onPress}
        onLongPress={isLocked ? undefined : onLongPress}
        bg={getBgColor()}
        borderColor={getBorderColor()}
        borderWidth={1}
        borderLeftWidth={3}
        borderLeftColor={isLocked ? '$gray6' : colors.dot}
        px="$1"
        py="$0.5"
        rounded="$1"
        opacity={isLocked ? 0.5 : isCompleted ? 0.7 : 1}
      >
        <XStack items="center" gap="$1">
          <Text
            fontSize={9}
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

  // Compact card for week view - fits 5+ days on screen
  return (
    <Card
      pressStyle={isLocked ? undefined : { opacity: 0.8, scale: 0.98 }}
      onPress={isLocked ? undefined : onPress}
      onLongPress={isLocked ? undefined : onLongPress}
      backgroundColor={getBgColor()}
      borderColor={getBorderColor()}
      borderWidth={isToday || isInProgress ? 2 : 1}
      p="$1.5"
      borderRadius="$2"
      opacity={isLocked ? 0.5 : isCompleted ? 0.7 : 1}
    >
      <YStack gap="$0.5">
        {/* Phase dot with status */}
        <XStack alignItems="center" justifyContent="space-between">
          <YStack
            width={6}
            height={6}
            borderRadius={10}
            backgroundColor={isLocked ? '$gray6' : colors.dot}
          />
          {getStatusIcon()}
        </XStack>

        {/* Workout name - truncated */}
        <Text
          fontSize={10}
          fontWeight="600"
          color={isLocked || isCompleted ? '$color10' : '$color12'}
          numberOfLines={2}
        >
          {name}
        </Text>

        {/* Meta info - minimal */}
        <Text fontSize={9} color="$color9">
          {isLocked ? phase : `${exerciseCount}ex · ${estimatedDurationMinutes}m`}
        </Text>
      </YStack>
    </Card>
  )
}
