import { YStack, XStack, Text, Card, styled } from 'tamagui'
import { Eye, Dumbbell, ChevronRight } from '@tamagui/lucide-icons'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface SportPreviewCardProps {
  sportName: string
  categoryName: string
  categoryShortName: string
  description?: string
  onPress: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

const CategoryBadge = styled(XStack, {
  bg: '$color4',
  px: '$2',
  py: '$1',
  rounded: '$2',
})

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function SportPreviewCard({
  sportName,
  categoryName,
  categoryShortName,
  description,
  onPress,
}: SportPreviewCardProps) {
  return (
    <Card
      p="$4"
      bg="$surface"
      borderColor="$borderColor"
      borderWidth={1}
      rounded="$4"
      pressStyle={{ scale: 0.98, bg: '$color3' }}
      onPress={onPress}
    >
      <XStack items="center" gap="$3">
        {/* Icon */}
        <YStack
          width={48}
          height={48}
          rounded="$4"
          bg="$brand2"
          items="center"
          justify="center"
        >
          <Dumbbell size={24} color="$primary" />
        </YStack>

        {/* Content */}
        <YStack flex={1} gap="$1">
          <XStack items="center" gap="$2">
            <Text fontSize={16} fontFamily="$body" fontWeight="600" color="$color12">
              {sportName}
            </Text>
            <CategoryBadge>
              <Text fontSize={10} fontFamily="$body" fontWeight="600" color="$color11">
                {categoryShortName}
              </Text>
            </CategoryBadge>
          </XStack>

          <Text fontSize={12} fontFamily="$body" color="$color10">
            {categoryName}
          </Text>

          {description && (
            <Text fontSize={11} fontFamily="$body" color="$color9" numberOfLines={1}>
              {description}
            </Text>
          )}
        </YStack>

        {/* Preview indicator */}
        <XStack items="center" gap="$1">
          <Eye size={14} color="$color9" />
          <ChevronRight size={16} color="$color9" />
        </XStack>
      </XStack>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKOUT PREVIEW CARD
// ─────────────────────────────────────────────────────────────────────────────

interface WorkoutPreviewCardProps {
  day: number
  focus: string
  exerciseCount: number
  exercisePreview: { name: string; sets: number; reps: string }[]
}

export function WorkoutPreviewCard({
  day,
  focus,
  exerciseCount,
  exercisePreview,
}: WorkoutPreviewCardProps) {
  return (
    <Card
      p="$4"
      bg="$surface"
      borderColor="$borderColor"
      borderWidth={1}
      rounded="$4"
    >
      <YStack gap="$3">
        {/* Header */}
        <XStack items="center" gap="$3">
          <YStack
            width={36}
            height={36}
            rounded="$10"
            bg="$color4"
            items="center"
            justify="center"
          >
            <Text fontSize={14} fontFamily="$body" fontWeight="700" color="$color11">
              {day}
            </Text>
          </YStack>

          <YStack flex={1}>
            <Text fontSize={14} fontFamily="$body" fontWeight="600" color="$color12">
              {focus}
            </Text>
            <Text fontSize={11} fontFamily="$body" color="$color10">
              {exerciseCount} exercises
            </Text>
          </YStack>

          <XStack bg="$yellow3" px="$2" py="$1" rounded="$2" items="center" gap="$1">
            <Eye size={10} color="$yellow10" />
            <Text fontSize={9} fontFamily="$body" fontWeight="600" color="$yellow10">
              PREVIEW
            </Text>
          </XStack>
        </XStack>

        {/* Exercise Preview */}
        <YStack gap="$2" pl="$5">
          {exercisePreview.map((exercise, index) => (
            <XStack key={index} items="center" gap="$2">
              <YStack
                width={4}
                height={4}
                rounded="$10"
                bg="$color8"
              />
              <Text fontSize={12} fontFamily="$body" color="$color11" flex={1}>
                {exercise.name}
              </Text>
              <Text fontSize={11} fontFamily="$body" color="$color9">
                {exercise.sets} x {exercise.reps}
              </Text>
            </XStack>
          ))}

          {exerciseCount > 3 && (
            <Text fontSize={11} fontFamily="$body" color="$color9" italic>
              +{exerciseCount - 3} more exercises
            </Text>
          )}
        </YStack>
      </YStack>
    </Card>
  )
}
