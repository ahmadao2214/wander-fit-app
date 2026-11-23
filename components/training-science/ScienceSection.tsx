import { useState, ComponentType } from 'react'
import { YStack, XStack, Card } from 'tamagui'
import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons'
import { Pressable } from 'react-native'

import { SectionTitle } from '../Typography'

interface ScienceSectionProps {
  title: string
  icon: ComponentType<{ size?: number; color?: any }>
  iconColor?: string
  iconBgColor?: string
  defaultExpanded?: boolean
  children: React.ReactNode
}

export function ScienceSection({
  title,
  icon: Icon,
  iconColor = '$primaryText',
  iconBgColor = '$brand2',
  defaultExpanded = false,
  children,
}: ScienceSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  return (
    <Card bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor" overflow="hidden">
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isExpanded }}
      >
        <XStack p="$4" items="center" gap="$3">
          <YStack bg={iconBgColor as any} p="$2" rounded="$10">
            <Icon size={20} color={iconColor} />
          </YStack>
          <SectionTitle flex={1} accessibilityRole={undefined}>
            {title}
          </SectionTitle>
          {isExpanded ? (
            <ChevronUp size={20} color="$color9" />
          ) : (
            <ChevronDown size={20} color="$color9" />
          )}
        </XStack>
      </Pressable>

      {isExpanded && (
        <YStack px="$4" pb="$4" gap="$3">
          {children}
        </YStack>
      )}
    </Card>
  )
}

export default ScienceSection
