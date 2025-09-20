import { H2, YStack } from 'tamagui'
import { ToastControl } from 'components/CurrentToast'

export default function TabOneScreen() {

  return (
    <YStack flex={1} items="center" gap="$8" px="$10" pt="$5" bg="$background">
      <H2>WanderFit</H2>
      <ToastControl />
    </YStack>
  )
}
