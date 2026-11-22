import { useEffect, useState } from 'react'
import { useColorScheme } from 'react-native'
import { Button, Input, Spinner, TextArea, XStack, YStack } from 'tamagui'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Caption, Supporting } from '../Typography'
import { FeedbackSheetFrame } from './FeedbackSheetFrame'
import { useSheetSession } from './useSheetSession'
import { useFeedbackToast } from './useFeedbackToast'
import { buildFeedbackContext, type FeedbackProgramContext } from '../../lib/feedbackContext'
import {
  FEATURE_CATEGORY_OPTIONS,
  FEEDBACK_DETAILS_MAX,
  FEEDBACK_TITLE_MAX,
  type FeatureCategory,
} from '../../lib/feedbackValidation'
import { selectionFeedback } from '../../lib/haptics'
import { analytics } from '../../lib/analytics'

export interface FeatureRequestSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  screenRoute: string
  programContext?: FeedbackProgramContext
  onSubmitted?: () => void
}

/**
 * Categorized feature request submission sheet.
 * Submit-and-toast only (no Athlete history view).
 */
export function FeatureRequestSheet({
  open,
  onOpenChange,
  screenRoute,
  programContext,
  onSubmitted,
}: FeatureRequestSheetProps) {
  const colorScheme = useColorScheme()
  const toast = useFeedbackToast()
  const submitFeatureRequest = useMutation(
    api.feedback?.submitFeatureRequest as typeof api.feedback.submitFeatureRequest
  )

  const [category, setCategory] = useState<FeatureCategory>('workouts_exercises')
  const [title, setTitle] = useState('')
  const [details, setDetails] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sheetSession = useSheetSession(open)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setCategory('workouts_exercises')
      setTitle('')
      setDetails('')
      setError(null)
    }
  }, [open])

  const canSubmit = title.trim().length > 0 && details.trim().length > 0 && !isSubmitting

  const handleSubmit = async () => {
    const trimmedTitle = title.trim()
    const trimmedDetails = details.trim()
    if (!trimmedTitle || !trimmedDetails) {
      setError('Please add both a title and a few details.')
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

      await submitFeatureRequest({
        category,
        title: trimmedTitle,
        details: trimmedDetails,
        context,
      })

      analytics.trackFeedbackSubmitted?.({
        kind: 'feature_request',
        category,
        source: 'profile',
      })

      toast.show('Idea sent!', 'Thanks for helping shape WanderFit.')
      onSubmitted?.()
      // The athlete may have closed (and reopened) the sheet while this was sending.
      if (sheetSession.current === session) onOpenChange(false)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not send idea. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <FeedbackSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      title="Request a feature"
      subtitle="Share an idea that would make your training better."
      defaultSnapPoint={76}
      keyboardSnapPoint={92}
      testID="feature-request-sheet"
    >
      <YStack gap="$4">
        {/* Category chips */}
        <YStack gap="$2">
          <Supporting fontWeight="600" color="$color11">
            Area
          </Supporting>
          <XStack gap="$2" flexWrap="wrap">
            {FEATURE_CATEGORY_OPTIONS.map((option) => {
              const selected = category === option.value
              return (
                <Button
                  key={option.value}
                  testID={`feature-category-${option.value}`}
                  size="$3"
                  minH={44}
                  px="$3"
                  bg={selected ? '$primary' : '$surface'}
                  color={selected ? 'white' : '$color11'}
                  borderWidth={1}
                  borderColor={selected ? '$primary' : '$borderColor'}
                  rounded="$10"
                  fontFamily="$body"
                  fontWeight="600"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    selectionFeedback()
                    setCategory(option.value)
                  }}
                >
                  {option.label}
                </Button>
              )
            })}
          </XStack>
        </YStack>

        {/* Idea title */}
        <YStack gap="$2">
          <Supporting fontWeight="600" color="$color11">
            Idea title
          </Supporting>
          <Input
            testID="feature-title-input"
            size="$4"
            placeholder="e.g. Rest timer audio chime"
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
            How would this help your training?
          </Supporting>
          <TextArea
            testID="feature-details-input"
            placeholder="Tell us when you'd use it and why it would help..."
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

        {error ? (
          <Supporting color="$red10" testID="feature-error">
            {error}
          </Supporting>
        ) : null}

        <Button
          testID="feature-submit-button"
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
          {isSubmitting ? <Spinner color="white" /> : 'Send idea'}
        </Button>
      </YStack>
    </FeedbackSheetFrame>
  )
}
