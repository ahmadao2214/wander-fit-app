import { useRouter } from 'expo-router'
import { Text, YStack } from 'tamagui'
import { FirstRunScreen } from '../../components/first-run/FirstRunScreen'
import { ProgramBar } from '../../components/first-run/ProgramBar'
import { ChoiceRow } from '../../components/first-run/ChoiceRow'
import { useReachStep } from '../../components/first-run/useReachStep'
import { useFirstRunDraft } from '../../hooks/useFirstRunDraft'
import { AGE_GROUP_CHOICES, YEARS_CHOICES } from '../../lib/firstRun'
import { selectionFeedback } from '../../lib/haptics'

function GroupLabel({ children, id }: { children: string; id: string }) {
  return (
    <Text fontFamily="$body" fontSize={15} fontWeight="700" color="$color11" nativeID={id} accessibilityRole="header">
      {children}
    </Text>
  )
}

/**
 * Questions 4 and 5: age group sets the intensity ceiling, years training
 * sets the skill level.
 */
export default function FirstRunAbout() {
  const router = useRouter()
  const { draft, save } = useFirstRunDraft()
  useReachStep('about')

  const ageGroup = draft?.answers.ageGroup
  const years = draft?.answers.years

  return (
    <FirstRunScreen
      step="about"
      title="About you"
      above={draft ? <ProgramBar answers={draft.answers} /> : null}
      primaryLabel="See my plan"
      primaryDisabled={!ageGroup || !years}
      onPrimary={() => router.push('/(first-run)/reveal')}
      primaryTestID="first-run-see-plan"
    >
      <YStack gap="$2.5" accessibilityRole="radiogroup" accessibilityLabelledBy="about-age">
        <GroupLabel id="about-age">Age group</GroupLabel>
        {AGE_GROUP_CHOICES.map((c) => (
          <ChoiceRow
            key={c.value}
            label={c.label}
            detail={c.range}
            selected={ageGroup === c.value}
            onPress={() => {
              selectionFeedback()
              void save({ ageGroup: c.value })
            }}
            testID={`age-${c.value}`}
          />
        ))}
      </YStack>

      <YStack gap="$2.5" accessibilityRole="radiogroup" accessibilityLabelledBy="about-years">
        <GroupLabel id="about-years">Years training for your sport</GroupLabel>
        {YEARS_CHOICES.map((c) => (
          <ChoiceRow
            key={c.value}
            label={c.label}
            selected={years === c.value}
            onPress={() => {
              selectionFeedback()
              void save({ years: c.value })
            }}
            testID={`years-${c.value}`}
          />
        ))}
      </YStack>
    </FirstRunScreen>
  )
}
