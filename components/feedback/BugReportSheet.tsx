import { useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import { Button, Card, Input, Spinner, TextArea, XStack, YStack } from 'tamagui'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import type { Id } from '../../convex/_generated/dataModel'
import { Caption, Supporting } from '../Typography'
import { FeedbackSheetFrame } from './FeedbackSheetFrame'
import { useSheetSession } from './useSheetSession'
import { useFeedbackToast } from './useFeedbackToast'
import { buildFeedbackContext, type FeedbackProgramContext } from '../../lib/feedbackContext'
import {
  BUG_SEVERITY_OPTIONS,
  FEEDBACK_DETAILS_MAX,
  FEEDBACK_TITLE_MAX,
  type BugSeverity,
  type BugSource,
} from '../../lib/feedbackValidation'
import { selectionFeedback } from '../../lib/haptics'
import { analytics } from '../../lib/analytics'

export interface BugWorkoutContextProp {
  gppSessionId?: Id<'gpp_workout_sessions'>
  templateId?: Id<'program_templates'>
  exerciseId?: Id<'exercises'>
  exerciseName?: string
}

export interface BugReportSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: BugSource
  screenRoute: string
  programContext?: FeedbackProgramContext
  workoutContext?: BugWorkoutContextProp
  /** Sanitized error class/code from FlowErrorBoundary (never raw exception text). */
  errorCode?: string
  onSubmitted?: () => void
}

/**
 * Structured bug report sheet with zero-PII technical context capture.
 * Submit-and-toast only (no Athlete history view).
 */
export function BugReportSheet({
  open,
  onOpenChange,
  source,
  screenRoute,
  programContext,
  workoutContext,
  errorCode,
  onSubmitted,
}: BugReportSheetProps) {
  const colorScheme = useColorScheme()
  const toast = useFeedbackToast()
  const submitBugReport = useMutation(
    api.feedback?.submitBugReport as typeof api.feedback.submitBugReport
  )

  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [severity, setSeverity] = useState<BugSeverity>('annoying')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sheetSession = useSheetSession(open)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setDetails('')
      setSeverity(source === 'error_boundary' ? 'blocking' : 'annoying')
      setError(null)
    }
  }, [open, source])

  const canSubmit = title.trim().length > 0 && details.trim().length > 0 && !isSubmitting

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    const trimmedDetails = details.trim()
    if (!trimmedTitle || !trimmedDetails) {
      setError('Please add both a short summary and what happened.')
      return
    }

    const session = sheetSession.current
    setIsSubmitting(true)
    setError(null)
    try {
      const context = buildFeedbackContext({
        screenRoute,
        colorScheme: colorScheme === 'dark' ? 'dark' : 'light',
        programContext,
      })

      const posthogSessionId = analytics.getSessionId?.()

      await submitBugReport({
        title: trimmedTitle,
        details: trimmedDetails,
        severity,
        source,
        context,
        ...(workoutContext ? { workoutContext } : {}),
        ...(errorCode ? { errorCode: errorCode.slice(0, 64) } : {}),
        ...(posthogSessionId ? { posthogSessionId } : {}),
      })

      analytics.trackFeedbackSubmitted?.({
        kind: 'bug_report',
        severity,
        source,
      })

      toast.show('Bug report sent', 'Thanks for helping us catch this.')
      onSubmitted?.()
      // The athlete may have closed (and reopened) the sheet while this was sending.
      if (sheetSession.current === session) onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send bug report. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FeedbackSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      title="Report a bug"
      subtitle="Tell us what went wrong so we can fix it fast."
      defaultSnapPoint={76}
      keyboardSnapPoint={92}
      testID="bug-report-sheet"
    >
      <YStack gap="$4">
        {workoutContext?.exerciseName ? (
          <Card px="$3" py="$2" bg="$brand1" rounded="$3" borderWidth={0}>
            <Supporting color="$primaryText" fontWeight="600">
              Linked to: {workoutContext.exerciseName}
            </Supporting>
          </Card>
        ) : null}

        {/* Summary */}
        <YStack gap="$2">
          <Supporting fontWeight="600" color="$color11">
            Short summary
          </Supporting>
          <Input
            testID="bug-title-input"
            size="$4"
            placeholder="e.g. Sets look way too high on Goblet Squat"
            value={title}
            onChangeText={(text) => setTitle(text.slice(0, FEEDBACK_TITLE_MAX))}
            maxLength={FEEDBACK_TITLE_MAX}
            bg="$surface"
            borderColor="$borderColor"
            fontFamily="$body"
            color="$color12"
          />
        </YStack>

        {/* Details */}
        <YStack gap="$2">
          <Supporting fontWeight="600" color="$color11">
            What happened?
          </Supporting>
          <TextArea
            testID="bug-details-input"
            placeholder="What were you doing, and what did you expect to see?"
            value={details}
            onChangeText={(text) => setDetails(text.slice(0, FEEDBACK_DETAILS_MAX))}
            maxLength={FEEDBACK_DETAILS_MAX}
            numberOfLines={4}
            minH={104}
            bg="$surface"
            borderColor="$borderColor"
            fontFamily="$body"
            color="$color12"
          />
          {FEEDBACK_DETAILS_MAX - details.length <= 200 ? (
            <Caption color="$color10" text="right">
              {FEEDBACK_DETAILS_MAX - details.length} characters left
            </Caption>
          ) : null}
        </YStack>

        {/* Severity */}
        <YStack gap="$2">
          <Supporting fontWeight="600" color="$color11">
            How much did it get in the way?
          </Supporting>
          <XStack gap="$2" flexWrap="wrap">
            {BUG_SEVERITY_OPTIONS.map((option) => {
              const selected = severity === option.value
              return (
                <Button
                  key={option.value}
                  testID={`bug-severity-${option.value}`}
                  flex={1}
                  minW={96}
                  minH={44}
                  size="$3"
                  bg={selected ? '$primary' : '$surface'}
                  color={selected ? 'white' : '$color11'}
                  borderWidth={1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  rounded="$3"
                  fontFamily="$body"
                  fontWeight="600"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    selectionFeedback()
                    setSeverity(option.value)
                  }}
                >
                  {option.label}
                </Button>
              )
            })}
          </XStack>
          <Caption color="$color10">
            {BUG_SEVERITY_OPTIONS.find((o) => o.value === severity)?.hint}
          </Caption>
        </YStack>

        <Caption color="$color10">
          Includes app version, device type, and current screen (no personal files).
        </Caption>

        {error ? (
          <Supporting color="$red10" testID="bug-error">
            {error}
          </Supporting>
        ) : null}

        <Button
          testID="bug-submit-button"
          size="$5"
          bg="$primary"
          color="white"
          fontFamily="$body"
          fontWeight="700"
          rounded="$4"
          disabled={!canSubmit}
          opacity={canSubmit ? 1 : 0.55}
          pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
          onPress={handleSubmit}
        >
          {isSubmitting ? <Spinner color="white" /> : 'Send bug report'}
        </Button>
      </YStack>
    </FeedbackSheetFrame>
  )
}
