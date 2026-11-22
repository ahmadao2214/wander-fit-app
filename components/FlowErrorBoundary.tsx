import React, { Component, ReactNode, useState } from 'react'
import { YStack, Text, Button, XStack } from 'tamagui'
import { AlertTriangle, RefreshCw, Home, Bug } from '@tamagui/lucide-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { captureBoundaryError } from '../lib/sentry'
import { useConvexAuth } from 'convex/react'
import { BugReportSheet } from './feedback'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface FlowErrorBoundaryProps {
  children: ReactNode
  /** Where to redirect when the athlete taps "Go Home" */
  fallbackRoute?: string
  /** Custom error message */
  errorMessage?: string
  /** Flow identifier tagged on Sentry error reports (e.g. "first-run", "reassessment") */
  flowName?: string
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

/**
 * Isolated bug-report trigger for ErrorFallback so rendering FlowErrorBoundary
 * outside a ConvexProvider (e.g. during early boot or isolated unit tests)
 * degrades silently instead of breaking the fallback UI.
 */
class SilentGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

function sanitizeErrorCode(error: Error | null): string {
  const rawName = error?.name?.trim() ?? ''
  const cleaned = rawName.replace(/[^A-Za-z0-9_.-]/g, '').slice(0, 64)
  return cleaned || 'UnknownError'
}

function ErrorFallbackBugReport({
  errorCode,
  fallbackRoute,
}: {
  errorCode: string
  fallbackRoute?: string
}) {
  const { isAuthenticated } = useConvexAuth()
  const [bugSheetOpen, setBugSheetOpen] = useState(false)

  if (!isAuthenticated) return null

  return (
    <>
      <Button
        testID="error-boundary-report-bug"
        size="$3"
        chromeless
        color="$color10"
        icon={<Bug size={16} color="$color10" />}
        onPress={() => setBugSheetOpen(true)}
      >
        Report a bug
      </Button>
      {bugSheetOpen ? (
        <BugReportSheet
          open={bugSheetOpen}
          onOpenChange={setBugSheetOpen}
          source="error_boundary"
          screenRoute={fallbackRoute || '/error-boundary'}
          errorCode={errorCode}
        />
      ) : null}
    </>
  )
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
    // The fallback can sit inside this boundary's own flow (the First Run's
    // does), so clear the error too, or the boundary keeps showing it there.
    onRetry()
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
          text="center"
        >
          Something went wrong
        </Text>
        <Text
          fontSize="$4"
          color="$color10"
          text="center"
          maxW={300}
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
          maxW={320}
          maxH={120}
        >
          <Text fontSize="$2" color="$gray11">
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

      <SilentGuard>
        <ErrorFallbackBugReport
          errorCode={sanitizeErrorCode(error)}
          fallbackRoute={fallbackRoute}
        />
      </SilentGuard>
    </YStack>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ERROR BOUNDARY CLASS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * FlowErrorBoundary
 *
 * A custom error boundary for multi-step flows (the First Run, reassessment).
 * Provides a friendly UI when errors occur and allows users
 * to retry or navigate away.
 *
 * @example
 * <FlowErrorBoundary fallbackRoute="/(first-run)">
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

    captureBoundaryError(error, {
      boundary: this.props.flowName ?? 'flow',
      componentStack: errorInfo.componentStack,
      route: this.props.fallbackRoute,
    })
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
