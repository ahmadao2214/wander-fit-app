import { YStack, XStack, Text, Card, type ColorTokens } from 'tamagui'
import { Body, Supporting, numeric } from '../Typography'
import { CheckCircle, Play, Lock } from '@tamagui/lucide-icons'
import type { Phase } from '../../types'
import { phaseTokens } from '../../lib/phase'


export interface CalendarWorkoutCardProps {
  templateId: string
  name: string
  phase: Phase
  week: number
  day: number
  exerciseCount: number // Main exercises, warmup not counted
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
  const colors = { dot: phaseTokens(phase).fill }

  // One neutral surface for every card. Phase is the left stripe; today is
  // the border; in progress, done and locked are the icon (and dimming).
  const isActive = !isLocked && !isCompleted && isToday
  const getBgColor = (): ColorTokens => (isLocked || isCompleted ? '$gray2' : '$background')
  const getBorderColor = (): ColorTokens => (isActive ? '$primary' : '$gray5')

  // Determine status icon
  const getStatusIcon = (size: number) => {
    if (isLocked) return <Lock size={size} color="$color10" />
    if (isCompleted) return <CheckCircle size={size} color="$color10" />
    if (isInProgress) return <Play size={size} color="$primaryText" />
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
  const exercisesLabel =
    exerciseCount > 0 ? `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}` : null
  const accessibilityLabel = [`${phase} workout`, name, `about ${estimatedDurationMinutes} minutes`, exercisesLabel, stateLabel]
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
          {getStatusIcon(12)}
        </XStack>
      </Card>
    )
  }

  // Week view: a full-width row in the day list. Name on the first line,
  // time and size on the second, status at the trailing edge.
  const meta = [`~${estimatedDurationMinutes}m`, exercisesLabel].filter(Boolean).join(' · ')
  return (
    <Card
      pressStyle={isLocked ? undefined : { opacity: 0.8, scale: 0.98 }}
      onPress={isLocked ? undefined : onPress}
      onLongPress={isLocked ? undefined : onLongPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      bg={getBgColor()}
      borderColor={getBorderColor()}
      borderWidth={isActive ? 2 : 1}
      borderLeftWidth={4}
      borderLeftColor={isLocked ? '$gray6' : colors.dot}
      rounded="$4"
      opacity={isLocked ? 0.5 : isCompleted ? 0.7 : 1}
      overflow="hidden"
      p={0}
      minH={56}
      justify="center"
    >
      <XStack items="center" gap="$2" px="$3" py="$2">
        <YStack flex={1} minW={0} gap="$0.5">
          <Body
            fontWeight="600"
            color={isLocked || isCompleted ? '$color10' : '$color12'}
            numberOfLines={3}
          >
            {name}
          </Body>
          <Supporting style={numeric}>{meta}</Supporting>
        </YStack>
        {getStatusIcon(16)}
      </XStack>
    </Card>
  )
}
