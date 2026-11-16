import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { Theme } from 'tamagui'
import { FlowErrorBoundary } from '../../components/FlowErrorBoundary'
import { useIntakeMotion } from '../../components/first-run/useIntakeMotion'
import { PAGE_TURN_MS } from '../../components/first-run/intakeMotion'
import { NIGHT } from '../../lib/firstRunStory'

/**
 * The First Run: four question screens with no account, the reveal, then
 * "Save your plan". Public. The root index keeps signed-in athletes with a
 * program out; the layout itself doesn't redirect, because the program is
 * saved from inside the reveal and the athlete then lands on the Program tab.
 *
 * Always game night (dark), whatever the phone's theme. Questions turn like
 * pages on iOS (the old page slides left and darkens), crossfade on web, and
 * swap instantly with Reduce Motion.
 */
export default function FirstRunLayout() {
  const motion = useIntakeMotion()
  const animation = motion.pageTurn === 'slide' ? 'slide_from_right' : motion.pageTurn === 'fade' ? 'fade' : 'none'

  return (
    <Theme name="dark">
      <StatusBar style="light" />
      <FlowErrorBoundary
        fallbackRoute="/(first-run)"
        errorMessage="Something went wrong building your plan. Your answers are saved, so let's pick up again."
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation,
            animationDuration: PAGE_TURN_MS,
            contentStyle: { backgroundColor: NIGHT.ink },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="sport" />
          <Stack.Screen name="season" />
          <Stack.Screen name="days" />
          <Stack.Screen name="about" />
          <Stack.Screen name="reveal" />
        </Stack>
      </FlowErrorBoundary>
    </Theme>
  )
}
