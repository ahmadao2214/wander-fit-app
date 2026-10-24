import { TouchableOpacity } from 'react-native'
import { Card, Text, XStack, YStack } from 'tamagui'
import { Dumbbell, House } from '@tamagui/lucide-icons'

export type EquipmentMode = 'gym' | 'home'

interface EquipmentModeToggleProps {
  value: EquipmentMode
  onChange: (mode: EquipmentMode) => void
  disabled?: boolean
}

const OPTIONS: Array<{
  mode: EquipmentMode
  label: string
  description: string
  icon: typeof Dumbbell
}> = [
  {
    mode: 'gym',
    label: 'Gym',
    description: 'Full equipment',
    icon: Dumbbell,
  },
  {
    mode: 'home',
    label: 'Home',
    description: 'Minimal gear',
    icon: House,
  },
]

export function EquipmentModeToggle({
  value,
  onChange,
  disabled = false,
}: EquipmentModeToggleProps) {
  return (
    <XStack
      bg="$color3"
      rounded="$6"
      p="$1"
      gap="$1"
      borderWidth={1}
      borderColor="$borderColor"
    >
      {OPTIONS.map((option) => {
        const isSelected = option.mode === value
        const Icon = option.icon

        return (
          <TouchableOpacity
            key={option.mode}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} mode`}
            accessibilityState={{
              disabled,
              selected: isSelected,
            }}
            disabled={disabled}
            onPress={() => onChange(option.mode)}
            style={{ flex: 1 }}
            activeOpacity={0.85}
          >
            <Card
              flex={1}
              bg={isSelected ? '$primary' : 'transparent'}
              borderWidth={isSelected ? 0 : 1}
              borderColor={isSelected ? 'transparent' : '$color5'}
              rounded="$5"
              px="$3"
              py="$2.5"
              opacity={disabled ? 0.6 : 1}
            >
              <XStack items="center" justify="center" gap="$2">
                <Icon size={16} color={isSelected ? 'white' : '$color10'} />
                <YStack items="center" gap="$0.5">
                  <Text
                    color={isSelected ? 'white' : '$color12'}
                    fontWeight="700"
                    fontSize="$3"
                  >
                    {option.label}
                  </Text>
                  <Text
                    color={isSelected ? 'rgba(255,255,255,0.85)' : '$color10'}
                    fontSize="$1"
                  >
                    {option.description}
                  </Text>
                </YStack>
              </XStack>
            </Card>
          </TouchableOpacity>
        )
      })}
    </XStack>
  )
}
