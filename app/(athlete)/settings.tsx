import { Button, ScrollView, Text, YStack, styled } from 'tamagui'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from '@tamagui/lucide-icons'

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
  'Open Claude on the web or on this phone.',
  'Add a custom connector for Wander Fit.',
  'Sign in with the same account you use in this app.',
  'Ask what today is. Claude reads the program from Wander Fit, and a change to a day waits for you to accept it.',
]

export default function AthleteSettingsScreen() {
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
          A chat can read your program and, after you accept, reorder a day or swap two days. The connector address is not published yet. These are the steps once it is.
        </BodyText>
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
