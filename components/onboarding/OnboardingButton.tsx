import { Button, Text, Spinner } from 'tamagui'
import { ReactNode } from 'react'

interface OnboardingButtonProps {
  /** Button text or content */
  children: ReactNode
  /** Called when button is pressed */
  onPress: () => void
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'ghost'
  /** Whether the button is loading */
  isLoading?: boolean
  /** Whether the button is disabled */
  disabled?: boolean
  /** Button size */
  size?: '$4' | '$5' | '$6'
}

/**
 * OnboardingButton - Styled action button for onboarding screens
 *
 * Provides consistent styling with three variants:
 * - primary: Green background, white text (main CTA)
 * - secondary: Gray background, dark text (alternative action)
 * - ghost: No background, just text (tertiary action like "Skip")
 */
export function OnboardingButton({
  children,
  onPress,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  size = '$5',
}: OnboardingButtonProps) {
  const isDisabled = disabled || isLoading

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          bg: '$green10',
          pressStyle: { bg: '$green11' },
          textColor: 'white',
        }
      case 'secondary':
        return {
          bg: '$gray4',
          pressStyle: { bg: '$gray5' },
          textColor: '$gray12',
        }
      case 'ghost':
        return {
          bg: 'transparent',
          pressStyle: { bg: '$gray2' },
          textColor: '$gray11',
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <Button
      size={size}
      bg={styles.bg}
      pressStyle={styles.pressStyle}
      onPress={onPress}
      disabled={isDisabled}
      opacity={isDisabled ? 0.6 : 1}
    >
      {isLoading ? (
        <Spinner size="small" color={styles.textColor} />
      ) : (
        <Text
          color={styles.textColor}
          fontWeight={variant === 'primary' ? '600' : '500'}
        >
          {children}
        </Text>
      )}
    </Button>
  )
}
