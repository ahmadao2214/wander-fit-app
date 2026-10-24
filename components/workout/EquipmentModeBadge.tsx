import { Card, Text, XStack } from 'tamagui'
import { Dumbbell, House } from '@tamagui/lucide-icons'

type EquipmentMode = 'gym' | 'home'

interface EquipmentModeBadgeProps {
  mode: EquipmentMode
}

const MODE_CONFIG: Record<
  EquipmentMode,
  {
    label: string
    icon: typeof Dumbbell
  }
> = {
  gym: {
    label: 'Gym setup',
    icon: Dumbbell,
  },
  home: {
    label: 'Home setup',
    icon: House,
  },
}

export function EquipmentModeBadge({ mode }: EquipmentModeBadgeProps) {
  const config = MODE_CONFIG[mode]
  const Icon = config.icon

  return (
    <Card bg="$color3" px="$2.5" py="$1.5" rounded="$10" borderWidth={1} borderColor="$borderColor">
      <XStack items="center" gap="$1.5">
        <Icon size={12} color="$color10" />
        <Text fontSize="$2" color="$color11" fontWeight="600">
          {config.label}
        </Text>
      </XStack>
    </Card>
  )
}
