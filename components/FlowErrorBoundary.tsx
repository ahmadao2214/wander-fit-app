import React, { Component, ReactNode } from 'react'
import { YStack, Text, Button, XStack } from 'tamagui'
import { AlertTriangle, RefreshCw, Home } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FlowErrorBoundaryProps {
  children: ReactNode
  /** Where to redirect when user taps "Go Home" */
  fallbackRoute?: string
  /** Custom error message */
  errorMessage?: string
}

interface FlowErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR FALLBACK UI
// ─────────────────────────────────────────────────────────────────────────────

interface ErrorFallbackProps {
  error: Error | null
  onRetry: () => void
  fallbackRoute?: string
  errorMessage?: string
}

function ErrorFallback({
  error,
  onRetry,
  fallbackRoute = '/',
  errorMessage
}: ErrorFallbackProps) {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const handleGoHome = () => {
    router.replace(fallbackRoute as any)
  }

  return (
    <YStack
      flex={1}
      bg="$background"
      items="center"
      justify="center"
      gap="$6"
      px="$6"
      pt={insets.top}
      pb={insets.bottom}
    >
      {/* Error Icon */}
      <YStack
        bg="$red3"
        p="$4"
        rounded="$6"
        items="center"
        justify="center"
      >
        <AlertTriangle size={48} color="$red10" />
      </YStack>

      {/* Error Message */}
      <YStack gap="$2" items="center">
        <Text
          fontSize="$7"
          fontWeight="700"
          color="$color12"
          textAlign="center"
        >
          Something went wrong
        </Text>
        <Text
          fontSize="$4"
          color="$color10"
          textAlign="center"
          maxWidth={300}
        >
          {errorMessage || "We hit a snag. Don't worry, your progress is saved."}
        </Text>
      </YStack>

      {/* Debug info in development */}
      {__DEV__ && error && (
        <YStack
          bg="$gray3"
          p="$3"
          rounded="$3"
          maxWidth={320}
          maxHeight={120}
        >
          <Text fontSize="$2" color="$gray11" fontFamily="$mono">
            {error.message.slice(0, 200)}
            {error.message.length > 200 ? '...' : ''}
          </Text>
        </YStack>
      )}

      {/* Action Buttons */}
      <XStack gap="$3" mt="$2">
        <Button
          size="$4"
          variant="outlined"
          icon={<Home size={18} />}
          onPress={handleGoHome}
        >
          Go Home
        </Button>
        <Button
          size="$4"
          bg="$primary"
          color="white"
          icon={<RefreshCw size={18} />}
          onPress={onRetry}
        >
          Try Again
        </Button>
      </XStack>
    </YStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FlowErrorBoundary
 *
 * A custom error boundary for intake and onboarding flows.
 * Provides a friendly UI when errors occur and allows users
 * to retry or navigate away.
 *
 * @example
 * <FlowErrorBoundary fallbackRoute="/(intake)/sport">
 *   <MyScreen />
 * </FlowErrorBoundary>
 */
export class FlowErrorBoundary extends Component<
  FlowErrorBoundaryProps,
  FlowErrorBoundaryState
> {
  constructor(props: FlowErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): FlowErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (__DEV__) {
      console.error('FlowErrorBoundary caught an error:', error)
      console.error('Component stack:', errorInfo.componentStack)
    }

    // TODO: Add production error reporting here (e.g., Sentry)
    // analytics.captureException(error, { extra: { componentStack: errorInfo.componentStack } })
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          onRetry={this.handleRetry}
          fallbackRoute={this.props.fallbackRoute}
          errorMessage={this.props.errorMessage}
        />
      )
    }

    return this.props.children
  }
}

export default FlowErrorBoundary
