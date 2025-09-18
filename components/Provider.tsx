import { useColorScheme } from 'react-native'
import { TamaguiProvider, type TamaguiProviderProps } from 'tamagui'
import { ToastProvider, ToastViewport } from '@tamagui/toast'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { CurrentToast } from './CurrentToast'
import { config } from '../tamagui.config'

export function Provider({ children, ...rest }: Omit<TamaguiProviderProps, 'config'>) {
  const colorScheme = useColorScheme()
  const convexClient = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
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
        <ConvexProvider client={convexClient}>
          {children}
        </ConvexProvider>
        <CurrentToast />
        <ToastViewport top="$8" left={0} right={0} />
      </ToastProvider>
    </TamaguiProvider>
  )
}
