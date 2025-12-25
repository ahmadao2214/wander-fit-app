import { YStack } from 'tamagui'
import { Dumbbell, Footprints } from '@tamagui/lucide-icons'

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

// Tags that indicate cardio/movement exercises
const CARDIO_TAGS = ['cardio', 'run', 'walk', 'jump', 'plyometric', 'sprint', 'jog', 'conditioning']

export function ExerciseTypeIcon({ 
  tags, 
  size = 64, 
  color = '$green10' 
}: ExerciseTypeIconProps) {
  // Check if any tag matches cardio/movement
  const isCardio = tags.some(tag => 
    CARDIO_TAGS.includes(tag.toLowerCase())
  )

  const IconComponent = isCardio ? Footprints : Dumbbell

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
