import { useConvexAuth } from 'convex/react'
import { Redirect, Stack } from 'expo-router'

export default function AuthRoutesLayout() {
  const { isAuthenticated } = useConvexAuth()

  if (isAuthenticated) {
    return <Redirect href={'/'} />
  }

  return <Stack />
}