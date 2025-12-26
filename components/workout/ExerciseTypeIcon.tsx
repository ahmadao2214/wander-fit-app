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
  color?: string
}

export function ExerciseTypeIcon({ 
  tags, 
  size = 64, 
  color = '$green10' 
}: ExerciseTypeIconProps) {
  const IconComponent = isCardioExercise(tags) ? Footprints : Dumbbell

  return (
    <YStack
      width={size * 1.5}
      height={size * 1.5}
      bg="$green2"
      borderRadius={size * 0.75}
      items="center"
      justify="center"
    >
      <IconComponent size={size} color={color as any} />
    </YStack>
  )
}

export default ExerciseTypeIcon
