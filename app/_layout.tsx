import '../tamagui-web.css'

import { useEffect } from 'react'
import { useColorScheme } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useFonts } from 'expo-font'
import { DarkTheme, DefaultTheme, ThemeProvider, SplashScreen, Stack } from 'expo-router'
import { Provider } from 'components/Provider'

// Import Google Fonts
import {
  BebasNeue_400Regular,
} from '@expo-google-fonts/bebas-neue'
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans'

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
  const [fontsLoaded, fontError] = useFonts({
    // Display font - Bebas Neue for headers
    BebasNeue: BebasNeue_400Regular,
    
    // Body font - Plus Jakarta Sans for all UI text
    PlusJakartaSans: PlusJakartaSans_400Regular,
    PlusJakartaSansMedium: PlusJakartaSans_500Medium,
    PlusJakartaSansSemiBold: PlusJakartaSans_600SemiBold,
    PlusJakartaSansBold: PlusJakartaSans_700Bold,
    
    // Keep Inter as fallback for Tamagui internals
    Inter: require('@tamagui/font-inter/otf/Inter-Medium.otf'),
    InterBold: require('@tamagui/font-inter/otf/Inter-Bold.otf'),
  })

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after the fonts have loaded (or an error was returned) and the UI is ready.
      SplashScreen.hideAsync()
    }
  }, [fontsLoaded, fontError])

  if (!fontsLoaded && !fontError) {
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
        
        {/* Onboarding flow (educational screens) */}
        <Stack.Screen
          name="(onboarding)"
          options={{
            headerShown: false,
          }}
        />
        
        {/* Reassessment flow (phase completion check-in) */}
        <Stack.Screen
          name="(reassessment)"
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
      </Stack>
    </ThemeProvider>
  )
}
