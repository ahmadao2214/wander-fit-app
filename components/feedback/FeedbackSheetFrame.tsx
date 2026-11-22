import { useEffect, useState, type ReactNode } from 'react'
import { Keyboard, Platform } from 'react-native'
import { Button, ScrollView, Separator, Sheet, XStack, YStack } from 'tamagui'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from '@tamagui/lucide-icons'
import { Supporting, Title } from '../Typography'

export interface FeedbackSheetFrameProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  defaultSnapPoint?: number
  keyboardSnapPoint?: number
  testID?: string
  /** Ignore user dismissal (close button, drag, overlay) while a submit is in flight. */
  dismissDisabled?: boolean
  children: ReactNode
}

/**
 * Shared keyboard-aware bottom sheet shell for all three feedback flows.
 * Follows AGENTS.md sheet rules: raises snap points when keyboard opens on
 * native, keeps ScrollView `keyboardShouldPersistTaps="handled"`, and respects
 * bottom safe-area insets.
 */
export function FeedbackSheetFrame({
  open,
  onOpenChange,
  title,
  subtitle,
  defaultSnapPoint = 72,
  keyboardSnapPoint = 92,
  testID,
  dismissDisabled = false,
  children,
}: FeedbackSheetFrameProps) {
  const insets = useSafeAreaInsets()
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  useEffect(() => {
    if (Platform.OS === 'web') return
    const showSub = Keyboard.addListener('keyboardDidShow', () => setIsKeyboardVisible(true))
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setIsKeyboardVisible(false))
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  // A pending submit closes the sheet itself when it lands. Letting the athlete
  // close and reopen meanwhile would let that late close discard the new draft.
  const handleOpenChange = (next: boolean) => {
    if (!next && dismissDisabled) return
    onOpenChange(next)
  }

  const snapPoints = isKeyboardVisible ? [keyboardSnapPoint] : [defaultSnapPoint]

  return (
    <Sheet
      modal
      open={open}
      onOpenChange={handleOpenChange}
      snapPoints={snapPoints}
      dismissOnSnapToBottom
    >
      <Sheet.Overlay
        animation="quick"
        opacity={0.5}
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
      />
      <Sheet.Frame
        bg="$background"
        maxW={520}
        self="center"
        width="100%"
        pt="$3"
        px="$4"
        pb={insets.bottom + 16}
        rounded="$5"
      >
        <Sheet.Handle />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ grow: 1 }}
        >
          <YStack testID={testID} gap="$4" pt="$2" pb="$2">
            <XStack items="flex-start" justify="space-between" gap="$3">
              <YStack flex={1} gap="$1">
                <Title accessibilityRole="header">{title}</Title>
                {subtitle ? <Supporting color="$color10">{subtitle}</Supporting> : null}
              </YStack>
              <Button
                size="$3"
                circular
                bg="$color3"
                icon={X}
                accessibilityLabel="Close"
                onPress={() => handleOpenChange(false)}
                disabled={dismissDisabled}
                minW={44}
                minH={44}
              />
            </XStack>

            <Separator />

            {children}
          </YStack>
        </ScrollView>
      </Sheet.Frame>
    </Sheet>
  )
}
