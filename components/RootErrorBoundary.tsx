import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native'
import { ErrorBoundary as ExpoRouterErrorBoundary, type ErrorBoundaryProps } from 'expo-router'
import { captureBoundaryError } from '../lib/sentry'

export interface RootErrorBoundaryProps extends ErrorBoundaryProps {
  /** Test-only override for rendering the production fallback in dev/Jest */
  forceProductionFallback?: boolean
}

/**
 * Root Expo Router ErrorBoundary wired into Sentry.
 *
 * - Reports every caught render error once to Sentry (deduplicated by error instance).
 * - In development, delegates rendering to Expo Router's default ErrorBoundary so
 *   stack traces, route diagnostics, and fast reload stay intact.
 * - In production, renders a zero-provider-dependency fallback screen using plain
 *   React Native primitives so it cannot crash even if RootLayout failed before
 *   TamaguiProvider or SafeAreaProvider mounted.
 */
export function RootErrorBoundary({
  error,
  retry,
  forceProductionFallback = false,
}: RootErrorBoundaryProps) {
  useEffect(() => {
    captureBoundaryError(error, { boundary: 'root' })
  }, [error])

  if (__DEV__ && !forceProductionFallback) {
    return <ExpoRouterErrorBoundary error={error} retry={retry} />
  }

  return <RootErrorFallback onRetry={retry} />
}

interface RootErrorFallbackProps {
  onRetry: () => Promise<void> | void
}

export function RootErrorFallback({ onRetry }: RootErrorFallbackProps) {
  const isDark = useColorScheme() === 'dark'

  const bg = isDark ? '#0B0F17' : '#F8FAFC'
  const surface = isDark ? '#141B29' : '#FFFFFF'
  const border = isDark ? '#232F46' : '#E2E8F0'
  const titleColor = isDark ? '#F8FAFC' : '#0F172A'
  const bodyColor = isDark ? '#94A3B8' : '#475569'

  return (
    <View style={[styles.container, { backgroundColor: bg }]} testID="root-error-fallback">
      <View style={[styles.card, { backgroundColor: surface, borderColor: border }]}>
        <Text style={[styles.heading, { color: titleColor }]}>Something went wrong</Text>
        <Text style={[styles.body, { color: bodyColor }]}>
          We hit an unexpected snag. Your training progress is safe — try reloading to pick up
          where you left off.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          onPress={() => {
            void onRetry()
          }}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
})

export default RootErrorBoundary
