import { YStack, ScrollView } from 'tamagui'
import { ReactNode } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

interface ScreenWrapperProps {
  children: ReactNode
  /** Maximum content width (default: 800 for mobile-first design) */
  maxWidth?: number
  /** Center content vertically and horizontally */
  centered?: boolean
  /** Add scroll support for long content */
  scrollable?: boolean
  /** Add padding for safe area insets (default: true) */
  useSafeArea?: boolean
  /** Additional padding at bottom */
  paddingBottom?: number
}

/**
 * ScreenWrapper - Base container for all screens
 * 
 * Provides consistent:
 * - Background color from theme
 * - Safe area padding
 * - Responsive horizontal padding
 * - Max width constraint for tablet/web
 * - Optional scroll support
 */
export function ScreenWrapper({
  children,
  maxWidth = 800,
  centered = false,
  scrollable = false,
  useSafeArea = true,
  paddingBottom = 0,
}: ScreenWrapperProps) {
  const insets = useSafeAreaInsets()

  const content = (
    <YStack
      flex={1}
      gap="$4"
      px="$4"
      pt={useSafeArea ? insets.top + 16 : '$4'}
      pb={useSafeArea ? insets.bottom + paddingBottom : paddingBottom}
      maxW={maxWidth}
      width="100%"
      self="center"
      $sm={{ px: '$5' }}
      $md={{ px: '$6' }}
      {...(centered && {
        items: 'center',
        justify: 'center',
      })}
    >
      {children}
    </YStack>
  )

  if (scrollable) {
    return (
      <YStack flex={1} bg="$background">
        <ScrollView
          flex={1}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ grow: 1 }}
        >
          {content}
        </ScrollView>
      </YStack>
    )
  }

  return (
    <YStack flex={1} bg="$background">
      {content}
    </YStack>
  )
}

/**
 * ScrollScreenWrapper - Convenience wrapper for scrollable screens
 */
export function ScrollScreenWrapper(props: Omit<ScreenWrapperProps, 'scrollable'>) {
  return <ScreenWrapper {...props} scrollable />
}
