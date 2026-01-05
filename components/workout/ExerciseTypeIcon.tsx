import { YStack } from 'tamagui'
import { Dumbbell, Footprints } from '@tamagui/lucide-icons'
import { isCardioExercise } from '../../lib'

/**
 * ExerciseTypeIcon - Simple icon based on exercise tags
 * 
 * Two-icon approach:
 * - Dumbbell: Default for all strength/resistance exercises
 * - Footprints: For cardio/movement exercises
 */

interface ExerciseTypeIconProps {
  tags: string[]
  size?: number
  /** Icon color (e.g. '$intensityMed6') */
  color?: string
  /** Background color (e.g. '$intensityMed3'). If not provided, no inner circle is rendered. */
  bgColor?: string
}

export function ExerciseTypeIcon({
  tags,
  size = 64,
  color = '$primary',
  bgColor,
}: ExerciseTypeIconProps) {
  const IconComponent = isCardioExercise(tags) ? Footprints : Dumbbell

  // If bgColor is provided, render icon inside a colored circle
  if (bgColor) {
    return (
      <YStack
        width={size * 1.5}
        height={size * 1.5}
        bg={bgColor as any}
        rounded={size * 0.75}
        items="center"
        justify="center"
      >
        <IconComponent size={size} color={color as any} />
      </YStack>
    )
  }

  // Otherwise, just render the icon (parent handles background)
  return <IconComponent size={size} color={color as any} />
}

export default ExerciseTypeIcon
