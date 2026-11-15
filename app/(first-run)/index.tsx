import { useRouter } from 'expo-router'
import { Text } from 'tamagui'
import { FirstRunScreen } from '../../components/first-run/FirstRunScreen'
import { useReachStep } from '../../components/first-run/useReachStep'

/** The promise: what the athlete gets, and how long it takes. */
export default function FirstRunPromise() {
  const router = useRouter()
  useReachStep('promise')

  return (
    <FirstRunScreen
      step="promise"
      title="Let's build your plan for this season."
      subtitle="Five questions, then your first workout."
      primaryLabel="Choose your sport"
      onPrimary={() => router.push('/(first-run)/sport')}
      primaryTestID="first-run-start"
      secondary={
        <Text
          fontFamily="$body"
          fontSize={15}
          fontWeight="600"
          color="$primary"
          text="center"
          py="$2"
          accessibilityRole="link"
          onPress={() => router.push('/(auth)/sign-in')}
          testID="first-run-sign-in"
        >
          I have an account
        </Text>
      }
    >
      {null}
    </FirstRunScreen>
  )
}
