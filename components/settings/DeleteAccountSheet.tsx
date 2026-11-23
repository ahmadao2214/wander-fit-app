import { useEffect, useState } from 'react'
import { Button, Input, Spinner, YStack } from 'tamagui'
import { useAction } from 'convex/react'
import { ConvexError } from 'convex/values'
import { useClerk } from '@clerk/clerk-expo'
import { useRouter } from 'expo-router'
import { api } from '../../convex/_generated/api'
import { FeedbackSheetFrame } from '../feedback/FeedbackSheetFrame'
import { Body, Caption, Supporting } from '../Typography'
import { firstRunDraft } from '../../lib/firstRunStorage'

/** What the athlete types to confirm. */
export const DELETE_CONFIRMATION = 'DELETE'

const LOSSES = [
  'Your program, with every phase and day',
  'Your workout history and every logged set',
  'Your 1RM maxes',
  'Your Intake answers',
]

/** The server's ConvexError for an account with legacy trainer data (convex/users.ts). */
function isTrainerDataError(err: unknown) {
  if (!(err instanceof ConvexError)) return false
  const data: unknown = err.data
  return data === 'trainer_data' || data === '"trainer_data"'
}

export interface DeleteAccountSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Two steps: what is lost (and that a store subscription is cancelled
 * separately), then typing DELETE. Deletes the Clerk account and every Convex
 * record, clears this device's First Run draft, signs out and opens the First
 * Run.
 */
export function DeleteAccountSheet({ open, onOpenChange }: DeleteAccountSheetProps) {
  const deleteMyAccount = useAction(api.users.deleteMyAccount)
  const { signOut } = useClerk()
  const router = useRouter()
  const [step, setStep] = useState<'explain' | 'confirm'>('explain')
  const [typed, setTyped] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Each opening starts at step one with nothing typed.
  useEffect(() => {
    if (open) {
      setStep('explain')
      setTyped('')
      setError(null)
    }
  }, [open])

  const confirmed = typed.trim() === DELETE_CONFIRMATION

  const handleDelete = async () => {
    if (!confirmed || isDeleting) return
    setIsDeleting(true)
    setError(null)
    try {
      await deleteMyAccount({})
    } catch (err) {
      console.error('Account deletion failed:', err)
      setError(
        isTrainerDataError(err)
          ? 'This account holds older shared data that support has to remove. Contact Wander Fit support to delete it.'
          : 'Your account was not deleted. Check your connection and try again.'
      )
      setIsDeleting(false)
      return
    }

    // The account is gone. Local cleanup is best effort: none of it may keep
    // the athlete on a screen for an account that no longer exists.
    try {
      await firstRunDraft.clear()
    } catch (err) {
      console.warn('First Run draft not cleared:', err)
    }
    try {
      await signOut()
    } catch (err) {
      // The Clerk session ended with the account; the local sign-out can still throw.
      console.warn('Sign out after deletion:', err)
    }
    router.replace('/(first-run)')
  }

  const close = (next: boolean) => {
    if (isDeleting) return
    onOpenChange(next)
  }

  return (
    <FeedbackSheetFrame
      open={open}
      onOpenChange={close}
      title={step === 'explain' ? 'Delete your account?' : 'Confirm deletion'}
      subtitle={step === 'explain' ? 'This is permanent and cannot be undone.' : undefined}
      defaultSnapPoint={72}
      keyboardSnapPoint={92}
      testID="delete-account-sheet"
    >
      {step === 'explain' ? (
        <YStack gap="$4" testID="delete-account-step-explain">
          <YStack gap="$2">
            <Body fontWeight="600">Deleting your account removes, for good:</Body>
            {LOSSES.map((loss) => (
              <Supporting key={loss}>• {loss}</Supporting>
            ))}
          </YStack>
          <YStack bg="$color3" rounded="$4" p="$3" gap="$1">
            <Body fontWeight="600">Subscribed through the App Store or Google Play?</Body>
            <Supporting>
              Deleting your account does not cancel it. Cancel it first in your device settings:
              your Apple ID&apos;s Subscriptions on iPhone, or Payments &amp; subscriptions in
              Google Play on Android.
            </Supporting>
          </YStack>
          <Button
            size="$5"
            bg="$red10"
            color="white"
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ bg: '$red11', scale: 0.98 }}
            onPress={() => setStep('confirm')}
            testID="delete-account-continue"
          >
            Continue
          </Button>
          <Button
            size="$4"
            bg="transparent"
            fontFamily="$body"
            fontWeight="600"
            onPress={() => onOpenChange(false)}
            testID="delete-account-cancel"
          >
            Keep my account
          </Button>
        </YStack>
      ) : (
        <YStack gap="$4" testID="delete-account-step-confirm">
          <YStack gap="$2">
            <Caption>Type {DELETE_CONFIRMATION} to delete your account</Caption>
            <Input
              testID="delete-account-confirm-input"
              nativeID="delete-account-confirm-input"
              accessibilityLabel={`Type ${DELETE_CONFIRMATION} to confirm`}
              size="$4"
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              editable={!isDeleting}
              placeholder={DELETE_CONFIRMATION}
              bg="$surface"
              borderColor="$borderColor"
              fontFamily="$body"
              color="$color12"
            />
          </YStack>
          {error ? (
            <Supporting color="$red11" testID="delete-account-error" role="alert">
              {error}
            </Supporting>
          ) : null}
          <Button
            size="$5"
            bg="$red10"
            color="white"
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            disabled={!confirmed || isDeleting}
            opacity={confirmed ? 1 : 0.55}
            pressStyle={{ bg: '$red11', scale: 0.98 }}
            onPress={handleDelete}
            testID="delete-account-submit"
            accessibilityState={{ disabled: !confirmed || isDeleting }}
          >
            {isDeleting ? <Spinner color="white" /> : 'Permanently delete my account'}
          </Button>
          <Button
            size="$4"
            bg="transparent"
            fontFamily="$body"
            fontWeight="600"
            disabled={isDeleting}
            onPress={() => setStep('explain')}
            testID="delete-account-back"
          >
            Back
          </Button>
        </YStack>
      )}
    </FeedbackSheetFrame>
  )
}
