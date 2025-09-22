import { Stack } from 'expo-router'

export default function AuthRoutesLayout() {
  // Don't redirect from auth layout - let individual pages handle their own logic
  // This prevents redirect loops
  return <Stack />
}