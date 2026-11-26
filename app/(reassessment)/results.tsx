import { useState } from 'react'
import { YStack, XStack, Button, Card, ScrollView, Spinner, Theme } from 'tamagui'
import { useSportScheme } from '../../hooks/useSportScheme'
import { phaseWord } from '../../lib/sportScreen'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useAuth } from '../../hooks/useAuth'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ArrowLeft, Check } from '@tamagui/lucide-icons'
import { Title, Body, Supporting, Caption, numeric } from '../../components/Typography'
import { blockRecap, decisionCopy, type ReassessmentDecision } from '../../lib/reassessment'

const DIFFICULTY_LABELS: Record<string, string> = {
  too_easy: 'Too easy',
  just_right: 'Just right',
  challenging: 'Challenging',
  too_hard: 'Too hard',
}

/**
 * Decision screen, the last step of the end-of-block check-in.
 *
 * Recaps the check-in, then the athlete chooses to move on to the next
 * phase or repeat this one. Nothing advances on its own: there is no timed
 * redirect, and confirming goes straight to Today (design audit F04, F11).
 */
function ResultsScreenContent() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { user } = useAuth()
  const params = useLocalSearchParams<{
    difficulty: string
    energy: string
    notes: string
    maxesUpdated: string
  }>()

  const [decision, setDecision] = useState<ReassessmentDecision | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reassessmentStatus = useQuery(
    api.userPrograms.getReassessmentStatus,
    user ? {} : 'skip'
  )

  const completeReassessment = useMutation(api.userPrograms.completeReassessment)

  if (reassessmentStatus === undefined) {
    return (
      <YStack flex={1} bg="$background" items="center" justify="center" gap="$4">
        <Spinner size="large" color="$color" />
        <Supporting color="$color10">Loading...</Supporting>
      </YStack>
    )
  }

  const phase = reassessmentStatus?.pendingForPhase
  const nextPhase = reassessmentStatus?.nextPhase
  if (!phase || !nextPhase) return null

  const difficulty = params.difficulty as string
  const energy = params.energy || undefined
  const notes = params.notes || undefined
  const maxesUpdated = params.maxesUpdated === 'true'

  const stats = reassessmentStatus.completionStats
  const recap = blockRecap(phase, stats?.completed ?? 0, stats?.expected ?? 0)

  // A skill-level raise only comes with moving on
  const canUpgrade =
    reassessmentStatus.canUpgradeSkillLevel &&
    (difficulty === 'too_easy' || difficulty === 'just_right')

  const options: ReassessmentDecision[] = ['move_on', 'repeat']

  const handleConfirm = async () => {
    if (!decision) return
    setIsSubmitting(true)
    setError(null)
    try {
      await completeReassessment({
        phaseDifficulty: difficulty as any,
        energyLevel: energy as any,
        notes,
        maxesUpdated,
        decision,
      })
      router.replace('/(athlete)')
    } catch (e) {
      console.error('Failed to complete reassessment:', e)
      setError("That didn't save. Check your connection and try again.")
      setIsSubmitting(false)
    }
  }

  const summaryRows: { label: string; value: string }[] = [
    { label: `${phaseWord(phase)} block`, value: recap.sessions },
    {
      label: 'How it felt',
      value: `${DIFFICULTY_LABELS[difficulty] ?? difficulty}${energy ? ` · ${energy} energy` : ''}`,
    },
    { label: 'Maxes', value: maxesUpdated ? 'Updated' : 'No changes' },
    ...(notes ? [{ label: 'Notes', value: notes }] : []),
  ]

  return (
    <YStack flex={1} bg="$background">
      <ScrollView
        flex={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 } as any}
      >
        <YStack
          px="$4"
          pt={insets.top + 16}
          pb={insets.bottom + 24}
          gap="$5"
          maxW={600}
          width="100%"
          self="center"
        >
          {/* Header */}
          <XStack items="center" gap="$3">
            <Button
              size="$3"
              variant="outlined"
              icon={ArrowLeft}
              onPress={() => router.back()}
              circular
              accessibilityLabel="Back"
            />
            <Title flex={1} accessibilityRole="header">
              What's next
            </Title>
          </XStack>

          {/* Check-in summary: one card, divided rows */}
          <Card bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor" overflow="hidden">
            {summaryRows.map((row, index) => (
              <XStack
                key={row.label}
                px="$4"
                py="$3"
                gap="$3"
                justify="space-between"
                borderTopWidth={index === 0 ? 0 : 1}
                borderColor="$borderColor"
              >
                <Supporting color="$color10">{row.label}</Supporting>
                <Supporting color="$color12" fontWeight="600" flex={1} text="right" style={numeric}>
                  {row.value}
                </Supporting>
              </XStack>
            ))}
          </Card>

          {/* The choice */}
          <YStack gap="$3" accessibilityRole="radiogroup">
            {options.map((option) => {
              const copy = decisionCopy(option, phase, nextPhase, reassessmentStatus.isFullCycleComplete)
              const selected = decision === option
              return (
                <Card
                  key={option}
                  testID={`decision-${option}`}
                  p="$4"
                  bg="$surface"
                  rounded="$4"
                  borderWidth={2}
                  borderColor={selected ? '$color' : '$borderColor'}
                  pressStyle={{ bg: '$surfaceHover' }}
                  onPress={() => setDecision(option)}
                  accessible
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={copy.label}
                  accessibilityHint={copy.detail}
                >
                  <XStack items="center" gap="$3">
                    <YStack flex={1} gap="$1">
                      <Body fontWeight="700">{copy.label}</Body>
                      <Supporting color="$color11">{copy.detail}</Supporting>
                      {option === 'move_on' && canUpgrade && reassessmentStatus.nextSkillLevel && (
                        <Supporting color="$color11">
                          Your skill level goes up to {reassessmentStatus.nextSkillLevel}.
                        </Supporting>
                      )}
                    </YStack>
                    <YStack
                      width={24}
                      height={24}
                      rounded="$10"
                      borderWidth={2}
                      borderColor={selected ? '$color' : '$color8'}
                      bg={selected ? '$color' : 'transparent'}
                      items="center"
                      justify="center"
                    >
                      {selected && <Check size={14} color="$background" strokeWidth={3} />}
                    </YStack>
                  </XStack>
                </Card>
              )
            })}
            <Caption>You can't change this later in the app.</Caption>
          </YStack>

          {error && (
            <Supporting color="$red10" accessibilityLiveRegion="polite">
              {error}
            </Supporting>
          )}

          <Button
            width="100%"
            size="$5"
            bg={decision ? '$primary' : '$color4'}
            color={decision ? '$background' : '$color10'}
            fontFamily="$body"
            fontWeight="700"
            rounded="$4"
            pressStyle={{ bg: decision ? '$primaryPress' : '$color4', scale: 0.98 }}
            disabled={!decision || isSubmitting}
            onPress={handleConfirm}
            testID="decision-confirm"
          >
            {isSubmitting
              ? 'Saving...'
              : decision === 'repeat'
                ? `Start ${phaseWord(phase)} again`
                : decision === 'move_on'
                  ? `Start ${phaseWord(nextPhase)}`
                  : 'Choose an option'}
          </Button>
        </YStack>
      </ScrollView>
    </YStack>
  )
}

/** On the basketball sport theme (issue #209): dark → chalkboard, light → whiteboard. */
export default function ResultsScreen() {
  const scheme = useSportScheme()
  return (
    <Theme name={scheme}>
      <ResultsScreenContent />
    </Theme>
  )
}
