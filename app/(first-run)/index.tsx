import { Pressable, Text as RNText, View, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { IntakeFrame } from '../../components/first-run/IntakeFrame'
import { BODY_SEMI, Headline, PromiseDrift, headlineSize } from '../../components/first-run/Night'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { useReachStep } from '../../components/first-run/useReachStep'
import { analytics, FIRST_RUN_STEP_INDEX } from '../../lib/analytics'
import { DRIFT_SPORTS, NIGHT } from '../../lib/firstRunStory'

/**
 * The promise. It's already there at launch, with no entrance: one huge
 * headline, sport icons drifting faintly behind it, and one button.
 */
export default function FirstRunPromise() {
  const router = useRouter()
  const motion = useIntakeMotion()
  const { width } = useWindowDimensions()
  useReachStep('promise')

  return (
    <IntakeFrame
      step="promise"
      ground={NIGHT.ink}
      moving={motion.moving}
      showTop={false}
      scroll={false}
      behind={<PromiseDrift sports={DRIFT_SPORTS} moving={motion.moving} />}
      primary={{
        label: 'Choose your sport',
        onPress: () => {
          analytics.trackFirstRunStepAdvanced({
            step: 'promise',
            step_index: FIRST_RUN_STEP_INDEX.promise,
          })
          router.push('/(first-run)/sport')
        },
        testID: 'first-run-start',
      }}
      secondary={
        <Pressable
          onPress={() => router.push('/(auth)/sign-in')}
          accessibilityRole="link"
          testID="first-run-sign-in"
          style={{ alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 }}
        >
          <RNText style={{ fontFamily: BODY_SEMI, fontSize: 15, color: NIGHT.link }}>I have an account</RNText>
        </Pressable>
      }
    >
      <View style={{ flex: 1, justifyContent: 'flex-end', paddingBottom: 24 }}>
        {/* Already there at launch: no wipe. */}
        <Headline size={headlineSize(92, width)} moving={false}>
          Let's build your plan for this season.
        </Headline>
      </View>
    </IntakeFrame>
  )
}
