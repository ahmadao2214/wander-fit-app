import { Button, YStack } from 'tamagui'
import * as WebBrowser from 'expo-web-browser'
import { FeedbackSheetFrame } from '../feedback/FeedbackSheetFrame'
import { Body, Supporting } from '../Typography'
import { HEALTH_DISCLAIMER, LEGAL_URLS } from '../../lib/legal'

export interface HealthDisclaimerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** The full Health & Fitness Disclaimer, readable without leaving the app. */
export function HealthDisclaimerSheet({ open, onOpenChange }: HealthDisclaimerSheetProps) {
  return (
    <FeedbackSheetFrame
      open={open}
      onOpenChange={onOpenChange}
      title={HEALTH_DISCLAIMER.title}
      subtitle={HEALTH_DISCLAIMER.notice}
      defaultSnapPoint={85}
      keyboardSnapPoint={85}
      testID="health-disclaimer-sheet"
    >
      <YStack gap="$4">
        {HEALTH_DISCLAIMER.sections.map((section, index) => (
          <YStack key={section.heading} gap="$1">
            <Body fontWeight="700">
              {index + 1}. {section.heading}
            </Body>
            <Supporting>{section.body}</Supporting>
          </YStack>
        ))}
        <Button
          size="$4"
          minH={44}
          self="flex-start"
          bg="transparent"
          borderWidth={1}
          borderColor="$borderColor"
          pressStyle={{ bg: '$color3' }}
          fontFamily="$body"
          fontWeight="600"
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
          testID="health-disclaimer-terms"
        >
          Read the Terms of Service
        </Button>
      </YStack>
    </FeedbackSheetFrame>
  )
}
