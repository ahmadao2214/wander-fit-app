import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Button } from 'tamagui'
import { LogOut } from '@tamagui/lucide-icons'

const SIGN_OUT_HASH = '#sign-out'

// Profile scrolls an inner view. Maestro web only scrolls the window, and a
// hash-only open does not remount the screen. scrollIntoView hits the window.
function scrollSignOutIntoView() {
  if (window.location.hash !== SIGN_OUT_HASH) return
  const node = document.getElementById('sign-out')
  if (!node) return
  let scroller: HTMLElement | null = null
  let overflow = 1
  let parent = node.parentElement
  while (parent) {
    const extra = parent.scrollHeight - parent.clientHeight
    const overflowY = window.getComputedStyle(parent).overflowY
    const scrolls =
      overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay' || overflowY === 'hidden'
    if (scrolls && extra > overflow) {
      overflow = extra
      scroller = parent
    }
    parent = parent.parentElement
  }
  if (!scroller) return
  const delta = node.getBoundingClientRect().top - scroller.getBoundingClientRect().top
  scroller.scrollTop += delta - scroller.clientHeight / 2 + node.offsetHeight / 2
}

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS !== 'web') return
    let interval = 0
    let stop = 0
    const arm = () => {
      if (window.location.hash !== SIGN_OUT_HASH) return
      window.clearInterval(interval)
      window.clearTimeout(stop)
      scrollSignOutIntoView()
      // Sections above the button arrive after the hash is set.
      interval = window.setInterval(scrollSignOutIntoView, 200)
      stop = window.setTimeout(() => window.clearInterval(interval), 25000)
    }
    arm()
    window.addEventListener('hashchange', arm)
    return () => {
      window.removeEventListener('hashchange', arm)
      window.clearInterval(interval)
      window.clearTimeout(stop)
    }
  }, [])

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
      testID="sign-out"
      nativeID="sign-out"
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
