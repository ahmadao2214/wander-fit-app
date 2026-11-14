import { Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { YStack, Text, Button } from 'tamagui'

/**
 * Unknown route. The native header is hidden (its back button showed a
 * route-group name like "(reassessment)" and its content sat under the
 * status bar), so the screen lays itself out inside the safe area.
 */
export default function NotFoundScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <YStack
        testID="not-found"
        flex={1}
        bg="$background"
        items="center"
        justify="center"
        gap="$4"
        px="$5"
        pt={insets.top + 16}
        pb={insets.bottom + 16}
      >
        <YStack items="center" gap="$2" maxW={320}>
          <Text fontFamily="$heading" fontSize={28} lineHeight={32} color="$color12" text="center">
            PAGE NOT FOUND
          </Text>
          <Text fontFamily="$body" fontSize={16} lineHeight={24} color="$color11" text="center">
            This link doesn't lead anywhere in the app.
          </Text>
        </YStack>
        <Button
          size="$5"
          bg="$primary"
          color="white"
          fontFamily="$body"
          fontWeight="700"
          rounded="$4"
          pressStyle={{ scale: 0.97, opacity: 0.9 }}
          onPress={() => router.replace('/')}
        >
          Go to the app
        </Button>
      </YStack>
    </>
  )
}
