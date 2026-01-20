import { Stack } from 'expo-router'
import { OnboardingRoute } from '../../components/AuthGuard'
import { FlowErrorBoundary } from '../../components/FlowErrorBoundary'

/**
 * Onboarding Flow Layout
 *
 * Educational screens interleaved with intake flow:
 * - Why It Works (periodization education)
 * - Phases Overview (GPP/SPP/SSP)
 * - Personal Timeline (12-week journey)
 * - Commitment (hold-to-confirm)
 *
 * Note: Some legacy screens are kept for revisit mode but
 * not used in the main combined flow.
 */
export default function OnboardingLayout() {
  return (
    <FlowErrorBoundary
      fallbackRoute="/(intake)/sport"
      errorMessage="Something went wrong in the onboarding flow. Your progress is saved."
    >
      <OnboardingRoute>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'slide_from_right',
            gestureEnabled: true, // Enable swipe back for better navigation
          }}
        >
          <Stack.Screen name="index" />
          {/* Used in combined flow */}
          <Stack.Screen name="why-it-works" />
          <Stack.Screen name="phases-overview" />
          <Stack.Screen name="personal-timeline" />
          <Stack.Screen name="commitment" />
          {/* Legacy screens for revisit mode */}
          <Stack.Screen name="welcome" />
          <Stack.Screen name="gpp-detail" />
          <Stack.Screen name="spp-detail" />
          <Stack.Screen name="ssp-detail" />
          <Stack.Screen name="progression" />
        </Stack>
      </OnboardingRoute>
    </FlowErrorBoundary>
  )
}
