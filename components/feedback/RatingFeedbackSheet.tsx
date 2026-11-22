import { useEffect, useState } from 'react'
import { Pressable, useColorScheme } from 'react-native'
import { Button, Spinner, TextArea, XStack, YStack } from 'tamagui'
import { Star } from '@tamagui/lucide-icons'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Body, Caption, Supporting } from '../Typography'
import { FeedbackSheetFrame } from './FeedbackSheetFrame'
import { useSheetSession } from './useSheetSession'
import { useFeedbackToast } from './useFeedbackToast'
import { buildFeedbackContext, type FeedbackProgramContext } from '../../lib/feedbackContext'
import { FEEDBACK_RATING_NOTE_MAX, type RatingTrigger } from '../../lib/feedbackValidation'
import { selectionFeedback } from '../../lib/haptics'
import { analytics } from '../../lib/analytics'

export interface RatingFeedbackSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: RatingTrigger
  screenRoute: string
  programContext?: FeedbackProgramContext
  /** Called when the athlete closes an auto-triggered prompt without submitting. */
  onDismiss?: () => void
  onSubmitted?: () => void
}

const STAR_LABELS = ['Needs work', 'Rough', 'Okay', 'Really good', 'Love it'] as const

/**
 * Private 1-5 star in-app rating sheet.
 *
 * Strictly decoupled from Apple App Store / Google Play review prompts —
 * never branches to a store review dialog or store URL based on star score.
 */
export function RatingFeedbackSheet({
  open,
  onOpenChange,
  trigger,
  screenRoute,
  programContext,
  onDismiss,
  onSubmitted,
}: RatingFeedbackSheetProps) {
  const colorScheme = useColorScheme()
  const toast = useFeedbackToast()
  const submitRating = useMutation(
    api.feedback?.submitRating as typeof api.feedback.submitRating
  )

  const [stars, setStars] = useState<number>(0)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const sheetSession = useSheetSession(open)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setStars(0)
      setNote('')
      setError(null)
    }
  }, [open])

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && open && trigger === 'post_workout_prompt' && !isSubmitting) {
      onDismiss?.()
    }
    onOpenChange(nextOpen)
  }

  const handleSelectStar = (value: number) => {
    selectionFeedback()
    setStars(value)
    setError(null)
  }

  const handleSubmit = async () => {
    if (stars < 1 || stars > 5) {
      setError('Tap a star rating first.')
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

      await submitRating({
        stars,
        note: note.trim() ? note.trim() : undefined,
        trigger,
        context,
      })

      analytics.trackFeedbackSubmitted?.({
        kind: 'rating',
        stars,
        source: trigger,
      })

      toast.show('Thanks for the rating!', 'Your private feedback goes straight to the WanderFit team.')
      onSubmitted?.()
      // The athlete may have closed (and reopened) the sheet while this was sending.
      if (sheetSession.current === session) onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not send rating. Please try again.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const remaining = FEEDBACK_RATING_NOTE_MAX - note.length

  return (
    <FeedbackSheetFrame
      open={open}
      onOpenChange={handleOpenChange}
      title={trigger === 'post_workout_prompt' ? "How's WanderFit feeling?" : 'Rate WanderFit'}
      subtitle="Shared privately with the WanderFit team to help improve your training."
      defaultSnapPoint={62}
      keyboardSnapPoint={88}
      testID="rating-feedback-sheet"
    >
      <YStack gap="$4">
        {/* 5-star picker */}
        <YStack items="center" gap="$2" py="$1">
          <XStack gap="$2" items="center" justify="center">
            {[1, 2, 3, 4, 5].map((value) => {
              const filled = value <= stars
              return (
                <Pressable
                  key={value}
                  testID={`rating-star-${value}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${value} ${value === 1 ? 'star' : 'stars'}`}
                  accessibilityState={{ selected: value === stars }}
                  onPress={() => handleSelectStar(value)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Star
                    size={34}
                    color={filled ? '$orange10' : '$color8'}
                    fill={filled ? '#F59E0B' : 'transparent'}
                  />
                </Pressable>
              )
            })}
          </XStack>
          <Supporting color={stars > 0 ? '$color12' : '$color10'} fontWeight={stars > 0 ? '600' : '400'}>
            {stars > 0 ? STAR_LABELS[stars - 1] : 'Tap a star to rate'}
          </Supporting>
        </YStack>

        {/* Optional private note */}
        <YStack gap="$2">
          <Supporting fontWeight="600" color="$color11">
            Anything working well or getting in your way? (Optional)
          </Supporting>
          <TextArea
            testID="rating-note-input"
            placeholder="Quick thoughts for the team..."
            value={note}
            onChangeText={(text) => setNote(text.slice(0, FEEDBACK_RATING_NOTE_MAX))}
            maxLength={FEEDBACK_RATING_NOTE_MAX}
            numberOfLines={4}
            minH={96}
            bg="$surface"
            borderColor="$borderColor"
            fontFamily="$body"
            color="$color12"
          />
          {remaining <= 150 ? (
            <Caption color="$color10" text="right">
              {remaining} characters left
            </Caption>
          ) : null}
        </YStack>

        {error ? (
          <Supporting color="$red10" testID="rating-error">
            {error}
          </Supporting>
        ) : null}

        <YStack gap="$2" pt="$1">
          <Button
            testID="rating-submit-button"
            size="$5"
            bg="$primary"
            color="white"
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            disabled={isSubmitting || stars === 0}
            opacity={isSubmitting || stars === 0 ? 0.55 : 1}
            pressStyle={{ bg: '$primaryPress', scale: 0.98 }}
            onPress={handleSubmit}
          >
            {isSubmitting ? <Spinner color="white" /> : 'Send rating'}
          </Button>

          {trigger === 'post_workout_prompt' ? (
            <Button
              testID="rating-dismiss-button"
              size="$4"
              chromeless
              color="$color10"
              fontFamily="$body"
              fontWeight="600"
              disabled={isSubmitting}
              onPress={() => handleOpenChange(false)}
            >
              <Body color="$color10" fontWeight="600">
                Not now
              </Body>
            </Button>
          ) : null}
        </YStack>
      </YStack>
    </FeedbackSheetFrame>
  )
}
