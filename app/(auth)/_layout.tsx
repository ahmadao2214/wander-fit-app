import { Stack } from 'expo-router'
import { ReplayExcludedSurface } from '../../components/ReplayExcludedSurface'

export default function AuthRoutesLayout() {
  // Don't redirect from auth layout - let individual pages handle their own logic
  // This prevents redirect loops
  return (
    <ReplayExcludedSurface>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      </Stack>
    </ReplayExcludedSurface>
  )
}
