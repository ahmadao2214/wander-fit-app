import { useState } from 'react'
import { YStack, XStack, Text, Card } from 'tamagui'
import { ChevronDown, ChevronUp, Info, Package } from '@tamagui/lucide-icons'
import { Pressable } from 'react-native'

/**
 * InstructionsAccordion - Collapsible section showing exercise instructions and equipment
 *
 * Clean, compact design with clear visual hierarchy.
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

  // Filter out notes that are just warmup/cooldown indicators
  const filteredNotes = notes &&
    !['warm_up', 'cool_down', 'warm up', 'cool down', 'warmup', 'cooldown'].includes(notes.toLowerCase().trim())
    ? notes
    : undefined

  // Don't render if no content
  if (!instructions && (!equipment || equipment.length === 0) && !filteredNotes) {
    return null
  }

  const hasEquipment = equipment && equipment.length > 0

  return (
    <YStack gap="$2">
      {/* Notes - always visible if present (filtered to exclude warm_up/cool_down) */}
      {filteredNotes && (
        <Card bg="$color3" p="$3" rounded="$3" borderLeftWidth={3} borderLeftColor="$yellow9">
          <XStack gap="$2" items="flex-start">
            <Info size={14} color="$yellow11" style={{ marginTop: 2 }} />
            <Text fontSize={13} fontFamily="$body" color="$color11" flex={1}>
              {filteredNotes}
            </Text>
          </XStack>
        </Card>
      )}

      {/* Equipment badges - centered */}
      {hasEquipment && (
        <XStack gap="$2" items="center" flexWrap="wrap" justify="center">
          <Package size={14} color="$color9" />
          {equipment.map((item, idx) => (
            <Card key={idx} bg="$color3" px="$2" py="$1" rounded="$2">
              <Text fontSize={12} fontFamily="$body" color="$color11" textTransform="capitalize">
                {item.replace(/_/g, ' ')}
              </Text>
            </Card>
          ))}
        </XStack>
      )}

      {/* Instructions accordion */}
      {instructions && (
        <YStack items="center">
          <Pressable onPress={() => setIsExpanded(!isExpanded)}>
            <XStack py="$2" items="center" gap="$1.5">
              {isExpanded ? (
                <ChevronUp size={14} color="$color9" />
              ) : (
                <ChevronDown size={14} color="$color9" />
              )}
              <Text fontSize={13} fontFamily="$body" fontWeight="500" color="$color9">
                {isExpanded ? 'Hide instructions' : 'How to perform'}
              </Text>
            </XStack>
          </Pressable>

          {isExpanded && (
            <Text
              fontSize={14}
              fontFamily="$body"
              color="$color11"
              lineHeight={22}
              alignSelf="flex-start"
            >
              {instructions}
            </Text>
          )}
        </YStack>
      )}
    </YStack>
  )
}

export default InstructionsAccordion
