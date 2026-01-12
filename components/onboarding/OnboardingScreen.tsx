import { ReactNode } from 'react'
import { YStack, XStack, Text, Button } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { OnboardingProgress } from './OnboardingProgress'

interface OnboardingScreenProps {
  /** Screen content */
  children: ReactNode
  /** Current screen index (0-based) */
  currentScreen: number
  /** Total number of screens */
  totalScreens: number
  /** Primary action button text */
  primaryButtonText: string
  /** Called when primary button is pressed */
  onPrimaryPress: () => void
  /** Called when skip is pressed */
  onSkip: () => void
  /** Whether to show the skip button (default: true) */
  showSkip?: boolean
  /** Whether the primary button is loading */
  isLoading?: boolean
  /** Whether this is a revisit flow (hides skip, changes behavior) */
  isRevisit?: boolean
}

/**
 * OnboardingScreen - Base wrapper for all onboarding screens
 *
 * Provides consistent layout with:
 * - Safe area insets
 * - Skip button (top right)
 * - Progress indicator
 * - Primary action button (bottom)
 */
export function OnboardingScreen({
  children,
  currentScreen,
  totalScreens,
  primaryButtonText,
  onPrimaryPress,
  onSkip,
  showSkip = true,
  isLoading = false,
  isRevisit = false,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets()

  return (
    <YStack
      flex={1}
      bg="$background"
      pt={insets.top}
      pb={insets.bottom}
    >
      {/* Header with Skip and Progress */}
      <XStack
        px="$4"
        py="$3"
        justify="space-between"
        items="center"
      >
        {/* Progress indicator */}
        <OnboardingProgress
          current={currentScreen}
          total={totalScreens}
        />

        {/* Skip button */}
        {showSkip && !isRevisit ? (
          <Button
            size="$3"
            chromeless
            onPress={onSkip}
            opacity={isLoading ? 0.5 : 1}
            disabled={isLoading}
          >
            <Text color="$gray11" fontSize="$3">
              Skip
            </Text>
          </Button>
        ) : (
          <YStack width={60} /> // Spacer for alignment
        )}
      </XStack>

      {/* Main Content */}
      <YStack flex={1} px="$4">
        {children}
      </YStack>

      {/* Footer with Primary Action */}
      <YStack px="$4" pb="$4" gap="$3">
        <Button
          size="$5"
          bg="$green10"
          pressStyle={{ bg: '$green11' }}
          onPress={onPrimaryPress}
          disabled={isLoading}
          opacity={isLoading ? 0.7 : 1}
        >
          <Text color="white" fontWeight="600">
            {primaryButtonText}
          </Text>
        </Button>
      </YStack>
    </YStack>
  )
}
