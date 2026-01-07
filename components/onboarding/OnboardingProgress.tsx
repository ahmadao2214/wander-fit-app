import { XStack, YStack } from 'tamagui'

interface OnboardingProgressProps {
  /** Current screen index (0-based) */
  current: number
  /** Total number of screens */
  total: number
}

/**
 * OnboardingProgress - Visual progress indicator for onboarding flow
 *
 * Shows a series of dots indicating progress through the onboarding screens.
 * Current dot is highlighted, completed dots are filled, upcoming are dimmed.
 */
export function OnboardingProgress({ current, total }: OnboardingProgressProps) {
  return (
    <XStack gap="$2" items="center">
      {Array.from({ length: total }, (_, index) => (
        <YStack
          key={index}
          width={index === current ? 24 : 8}
          height={8}
          rounded="$2"
          bg={index <= current ? '$green10' : '$gray5'}
          animation="quick"
        />
      ))}
    </XStack>
  )
}
