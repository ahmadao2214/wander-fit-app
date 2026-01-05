import { Stack } from 'expo-router'

export default function AuthRoutesLayout() {
  // Don't redirect from auth layout - let individual pages handle their own logic
  // This prevents redirect loops
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="sign-in" options={{ headerShown: false }} />
      <Stack.Screen name="sign-up" options={{ headerShown: false }} />
    </Stack>
  )
}