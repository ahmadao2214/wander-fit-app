import '../tamagui-web.css'

import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { SplashScreen, Stack } from 'expo-router'
import { Provider } from 'components/Provider'
import { useTheme } from 'tamagui'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router'

export const unstable_settings = {
  // Ensure that reloading on any route goes through the index route for proper auth flow
  initialRouteName: 'index',
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const [interLoaded, interError] = useFonts({
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  useEffect(() => {
    if (interLoaded || interError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [interLoaded, interError])

  if (!interLoaded && !interError) {
    return null
  }

  return (
    <Providers>
      <RootLayoutNav />
    </Providers>
  )
}

const Providers = ({ children }: { children: React.ReactNode }) => {
  return <Provider>{children}</Provider>
}

function RootLayoutNav() {
  const colorScheme = useColorScheme()
  const theme = useTheme()
  
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack>
        {/* Auth routes (sign in, sign up) */}
        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* Intake flow (sport selection, experience, results) */}
        <Stack.Screen
          name="(intake)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* Main athlete dashboard */}
        <Stack.Screen
          name="(athlete)"
          options={{
            headerShown: false,
          }}
        />

        {/* Index/landing page */}
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />

        {/* ═══════════════════════════════════════════════════════════════════
            LEGACY ROUTES (kept for backward compatibility during migration)
            These will be removed once migration is complete
            ═══════════════════════════════════════════════════════════════════ */}
        
        {/* @deprecated - Use (athlete) instead */}
        <Stack.Screen
          name="(client)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* @deprecated - Trainer functionality removed in GPP model */}
        <Stack.Screen
          name="(trainer)"
          options={{
            headerShown: false,
          }}
        />

        {/* @deprecated - Trainer functionality removed */}
        <Stack.Screen
          name="add-client"
          options={{
            title: 'Add Client',
            presentation: 'modal',
            animation: 'slide_from_bottom',
            gestureEnabled: true,
            gestureDirection: 'vertical',
            contentStyle: {
              backgroundColor: theme.background.val,
            },
          }}
        />
      </Stack>
    </ThemeProvider>
  )
}
