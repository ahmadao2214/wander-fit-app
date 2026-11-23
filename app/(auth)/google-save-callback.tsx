import { useEffect, useRef, useState } from 'react'
import { useClerk, useUser } from '@clerk/clerk-expo'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { Spinner, Text, YStack } from 'tamagui'

export default function GoogleSaveCallback() {
  const insets = useSafeAreaInsets()
  const clerk = useClerk()
  const { isLoaded } = useUser()
  const started = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isLoaded || started.current) return
    started.current = true
    void clerk
      .handleRedirectCallback({
        signInForceRedirectUrl: '/reveal?saveWith=google',
        signUpForceRedirectUrl: '/reveal?saveWith=google',
      })
      .catch(() => setFailed(true))
  }, [clerk, isLoaded])

  return (
    <YStack
      flex={1}
      items="center"
      justify="center"
      px="$5"
      pt={insets.top + 20}
      pb={insets.bottom + 20}
      gap="$3"
      bg="$background"
    >
      {failed ? (
        <>
          <Text>Google sign-in didn’t finish. Your plan is still here.</Text>
          <Link href="/(first-run)/reveal">Return to your plan</Link>
        </>
      ) : (
        <>
          <Spinner />
          <Text>Finishing Google sign-in…</Text>
        </>
      )}
    </YStack>
  )
}
