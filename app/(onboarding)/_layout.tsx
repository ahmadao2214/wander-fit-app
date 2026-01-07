import { Stack } from 'expo-router'
import { OnboardingRoute } from '../../components/AuthGuard'

/**
 * Onboarding Flow Layout
 *
 * Educational screens shown after intake completion:
 * 1. Welcome & Journey Introduction (3 screens)
 * 2. Phase Education - GPP/SPP/SSP (3 screens)
 * 3. Personalized Timeline & Commitment (2 screens)
 * 4. How It Works & First Workout (2 screens)
 *
 * Features:
 * - Skippable at any point
 * - Revisitable from settings
 * - Progress saved for resume
 */
export default function OnboardingLayout() {
  return (
    <OnboardingRoute>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          gestureEnabled: false, // Disable swipe back during onboarding
        }}
      >
        <Stack.Screen name="index" />
        {/* Section 1: Welcome & Journey Introduction */}
        <Stack.Screen name="welcome" />
        <Stack.Screen name="phases-overview" />
        <Stack.Screen name="why-it-works" />
        {/* Section 2: Phase Education - GPP/SPP/SSP */}
        <Stack.Screen name="gpp-detail" />
        <Stack.Screen name="spp-detail" />
        <Stack.Screen name="ssp-detail" />
      </Stack>
    </OnboardingRoute>
  )
}
