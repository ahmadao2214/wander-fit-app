import { useColorScheme } from 'react-native'
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui'
import { ToastProvider, ToastViewport } from '@tamagui/toast'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'
import { tokenCache } from '@clerk/clerk-expo/token-cache'
import { ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { CurrentToast } from './CurrentToast'
import { config } from '../tamagui.config'

export function Provider({ children, ...rest }: Omit<TamaguiProviderProps, 'config'>) {
  const colorScheme = useColorScheme()
  
  // Debug logging for environment variables
  const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL
  const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  
  if (!convexUrl) {
    console.error('❌ EXPO_PUBLIC_CONVEX_URL is not defined!')
  } else {
    console.log('✅ Convex URL:', convexUrl)
  }
  
  if (!clerkKey) {
    console.error('❌ EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined!')
  } else {
    console.log('✅ Clerk Key:', clerkKey.substring(0, 20) + '...')
  }
  
  const convexClient = new ConvexReactClient(convexUrl!, {
    unsavedChangesWarning: false,
  })
  
  return (
    <TamaguiProvider
      config={config}
      defaultTheme={colorScheme === 'dark' ? 'dark' : 'light'}
      {...rest}
    >
      <ToastProvider
        swipeDirection="horizontal"
        duration={6000}
        native={
          [
            // uncomment the next line to do native toasts on mobile. NOTE: it'll require you making a dev build and won't work with Expo Go
            // 'mobile'
          ]
        }
      >
        <ClerkProvider 
          publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
          tokenCache={tokenCache}
        >
          <ConvexProviderWithClerk client={convexClient} useAuth={useAuth}>
            {children}
          </ConvexProviderWithClerk>
        </ClerkProvider>
        <CurrentToast />
        <ToastViewport top="$8" left={0} right={0} pointerEvents="box-none" />
      </ToastProvider>
    </TamaguiProvider>
  )
}
