import { useEffect } from 'react'
import { Platform } from 'react-native'
import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { Button } from 'tamagui'
import { LogOut } from '@tamagui/lucide-icons'
import { createSignOutFollow, type SignOutNode } from '../lib/signOutScroll'

function toSignOutNode(element: HTMLElement): SignOutNode {
  return {
    get parent() {
      const parent = element.parentElement
      return parent instanceof HTMLElement ? toSignOutNode(parent) : null
    },
    get scrollHeight() {
      return element.scrollHeight
    },
    get clientHeight() {
      return element.clientHeight
    },
    get scrollTop() {
      return element.scrollTop
    },
    set scrollTop(value: number) {
      element.scrollTop = value
    },
    get overflowY() {
      return window.getComputedStyle(element).overflowY
    },
    get top() {
      return element.getBoundingClientRect().top
    },
    get height() {
      return element.offsetHeight
    },
  }
}

export const SignOutButton = () => {
  // Use `useClerk()` to access the `signOut()` function
  const { signOut } = useClerk()
  const router = useRouter()

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const follow = createSignOutFollow({
      hash: () => window.location.hash,
      button: () => {
        const node = document.getElementById('sign-out')
        return node ? toSignOutNode(node) : null
      },
      viewportHeight: () => window.innerHeight,
      schedule: (fn, ms) => window.setInterval(fn, ms),
      cancel: (id) => window.clearInterval(id),
      later: (fn, ms) => window.setTimeout(fn, ms),
    })
    const onUserScroll = () => follow.noteUserScroll()
    const onKeyScroll = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown' || event.key === ' ' || event.key === 'Home' || event.key === 'End') {
        onUserScroll()
      }
    }
    follow.arm()
    window.addEventListener('hashchange', follow.arm)
    window.addEventListener('wheel', onUserScroll, { capture: true, passive: true })
    window.addEventListener('touchstart', onUserScroll, { capture: true })
    window.addEventListener('keydown', onKeyScroll)
    return () => {
      window.removeEventListener('hashchange', follow.arm)
      window.removeEventListener('wheel', onUserScroll, { capture: true })
      window.removeEventListener('touchstart', onUserScroll, { capture: true })
      window.removeEventListener('keydown', onKeyScroll)
      follow.dispose()
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
