import { useState } from 'react'
import { YStack, XStack, Text, Card } from 'tamagui'
import { ChevronDown, ChevronUp, Info, Wrench } from '@tamagui/lucide-icons'
import { Pressable } from 'react-native'

/**
 * InstructionsAccordion - Collapsible section showing exercise instructions and equipment
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
    <Card borderColor="$gray6" borderWidth={1} overflow="hidden">
      <Pressable onPress={() => setIsExpanded(!isExpanded)}>
        <XStack 
          px="$4" 
          py="$3" 
          items="center" 
          justify="space-between"
          bg={isExpanded ? '$gray2' : 'transparent'}
        >
          <XStack items="center" gap="$2">
            <Info size={18} color="$blue10" />
            <Text fontSize="$4" fontWeight="600" color="$color12">
              View Instructions
            </Text>
          </XStack>
          {isExpanded ? (
            <ChevronUp size={20} color="$color10" />
          ) : (
            <ChevronDown size={20} color="$color10" />
          )}
        </XStack>
      </Pressable>

      {isExpanded && (
        <YStack px="$4" py="$3" gap="$3" bg="$gray1">
          {/* Instructions */}
          {instructions && (
            <YStack gap="$1">
              <Text fontSize="$2" color="$color10" fontWeight="600">
                How to perform:
              </Text>
              <Text fontSize="$3" color="$color11" lineHeight={22}>
                {instructions}
              </Text>
            </YStack>
          )}

          {/* Equipment */}
          {equipment && equipment.length > 0 && (
            <YStack gap="$1">
              <XStack items="center" gap="$1">
                <Wrench size={14} color="$color10" />
                <Text fontSize="$2" color="$color10" fontWeight="600">
                  Equipment needed:
                </Text>
              </XStack>
              <XStack gap="$2" flexWrap="wrap">
                {equipment.map((item) => (
                  <Card key={item} bg="$gray3" px="$2" py="$1" rounded="$2">
                    <Text fontSize="$2" color="$color11">
                      {item}
                    </Text>
                  </Card>
                ))}
              </XStack>
            </YStack>
          )}

          {/* Notes */}
          {notes && (
            <Card bg="$yellow2" p="$3" rounded="$2">
              <Text fontSize="$2" color="$yellow11">
                <Text fontWeight="600">Note: </Text>
                {notes}
              </Text>
            </Card>
          )}
        </YStack>
      )}
    </Card>
  )
}

export default InstructionsAccordion
