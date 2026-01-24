import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Button } from 'tamagui'
import { LogOut } from '@tamagui/lucide-icons'

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk()
  const router = useRouter()

  const handleSignOut = async () => {
    try {
      console.log('Signing out...')
      await signOut()
      console.log('Sign out successful, navigating to sign-in')
      // Navigate directly to sign-in to avoid index page loops
      router.replace('/(auth)/sign-in')
    } catch (err) {
      // See https://clerk.com/docs/custom-flows/error-handling
      // for more info on error handling
      console.error('Sign out error:', JSON.stringify(err, null, 2))
    }
  }

  return (
    <Button
      size="$4"
      bg="$color4"
      color="$color11"
      borderWidth={1}
      borderColor="$borderColor"
      icon={LogOut}
      fontFamily="$body"
      fontWeight="600"
      rounded="$4"
      pressStyle={{ opacity: 0.8, bg: '$color5' }}
      onPress={handleSignOut}
    >
      Sign Out
    </Button>
  )
}
