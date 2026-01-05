import { useState } from 'react'
import { YStack, XStack, Text } from 'tamagui'
import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons'
import { Pressable } from 'react-native'

/**
 * InstructionsAccordion - Collapsible section showing exercise instructions and equipment
 *
 * Minimal, borderless design that flows naturally with the content.
 */

interface InstructionsAccordionProps {
  instructions?: string
  equipment?: string[]
  notes?: string
}

export function InstructionsAccordion({
  instructions,
  equipment,
  notes
}: InstructionsAccordionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Don't render if no content
  if (!instructions && (!equipment || equipment.length === 0) && !notes) {
    return null
  }

  return (
    <YStack>
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <XStack
          py="$2"
          items="center"
          gap="$2"
        >
          {isExpanded ? (
            <ChevronUp size={16} color="$color10" />
          ) : (
            <ChevronDown size={16} color="$color10" />
          )}
          <Text fontSize={14} fontFamily="$body" fontWeight="500" color="$color10">
            How to perform
          </Text>
        </XStack>
      </Pressable>

      {isExpanded && (
        <YStack pt="$2" pb="$1" gap="$3">
          {/* Instructions */}
          {instructions && (
            <Text fontSize={14} fontFamily="$body" color="$color11" lineHeight={22}>
              {instructions}
            </Text>
          )}

          {/* Equipment - minimal inline display */}
          {equipment && equipment.length > 0 && (
            <Text fontSize={13} fontFamily="$body" color="$color9">
              Equipment: {equipment.join(' • ')}
            </Text>
          )}

          {/* Notes */}
          {notes && (
            <YStack bg="$yellow2" p="$3" rounded="$2">
              <Text fontSize={13} fontFamily="$body" color="$yellow11">
                <Text fontWeight="600">Note: </Text>
                {notes}
              </Text>
            </YStack>
          )}
        </YStack>
      )}
    </YStack>
  )
}

export default InstructionsAccordion
