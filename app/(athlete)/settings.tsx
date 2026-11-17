import { Button, ScrollView, Text, YStack, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from '@tamagui/lucide-icons'
import { mcpAddress } from '../../lib/mcpAddress'

const DisplayHeading = styled(Text, {
  fontFamily: '$heading',
  fontSize: 28,
  letterSpacing: 0.5,
  color: '$color12',
})

const BodyText = styled(Text, {
  fontFamily: '$body',
  fontSize: 15,
  lineHeight: 22,
  color: '$color11',
})

const StepTitle = styled(Text, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 15,
  color: '$color12',
})

const STEPS = [
  'On claude.ai or the Claude desktop app, open Settings, then Connectors, and add a custom connector.',
  'Name it Wander Fit and paste the address above.',
  'Select Connect and sign in with the same account you use in this app.',
  'Open Claude on this phone and ask what today is. A change to a day waits for you to accept it.',
]

const Address = styled(Text, {
  fontFamily: '$body',
  fontSize: 15,
  color: '$color12',
})

export default function AthleteSettingsScreen() {
  const address = mcpAddress(process.env.EXPO_PUBLIC_CONVEX_URL)
  const insets = useSafeAreaInsets()
  const router = useRouter()

  return (
    <ScrollView
      flex={1}
      bg="$background"
      contentContainerStyle={{ pb: insets.bottom + 32 }}
    >
      <YStack px="$4" pt={insets.top + 12} gap="$4">
        <Button
          unstyled
          onPress={() => router.back()}
          icon={<ChevronLeft size={22} color="$color11" />}
          self="flex-start"
          aria-label="Back"
        />
        <DisplayHeading>App Settings</DisplayHeading>
        <BodyText>
          Claude can read your program and, after you accept, reorder today&apos;s exercises or swap two days. Logging sets stays in this app.
        </BodyText>
        <YStack gap="$1" bg="$color2" rounded="$4" p="$3">
          <StepTitle>Connector address</StepTitle>
          {address ? (
            <Address selectable testID="mcp-address">
              {address}
            </Address>
          ) : (
            <BodyText>This build has no connector address.</BodyText>
          )}
        </YStack>
        <YStack gap="$3">
          {STEPS.map((step, index) => (
            <YStack key={step} gap="$1">
              <StepTitle>{index + 1}</StepTitle>
              <BodyText>{step}</BodyText>
            </YStack>
          ))}
        </YStack>
      </YStack>
    </ScrollView>
  )
}
