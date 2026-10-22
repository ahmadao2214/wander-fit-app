import * as React from 'react'
import { Platform, Pressable } from 'react-native'
import { RadioGroup, Label, XStack, YStack, styled } from 'tamagui'
import type { User } from '@tamagui/lucide-icons'

// @tamagui/lucide-icons doesn't re-export IconProps; derive it from any icon
type IconProps = React.ComponentProps<typeof User>

// Icon-based card container
const RadioCard = styled(YStack, {
  flex: 1,
  gap: '$3',
  p: '$4',
  rounded: '$4',
  borderWidth: 2,
  borderColor: '$borderColor',
  bg: '$surface',
  items: 'center',
  justify: 'center',
  minH: 140,

  variants: {
    checked: {
      true: {
        borderColor: '$primary',
        bg: '$brand2',
      },
      false: {
        borderColor: '$borderColor',
        bg: '$surface',
      },
    },
  } as const,

  ...(Platform.OS === 'web' && {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    hoverStyle: {
      borderColor: '$primary',
      opacity: 0.9,
    },
  }),
})

// Icon container with background
const IconContainer = styled(YStack, {
  width: 56,
  height: 56,
  rounded: '$10',
  items: 'center',
  justify: 'center',

  variants: {
    checked: {
      true: {
        bg: '$primary',
      },
      false: {
        bg: '$brand2',
      },
    },
  } as const,
})

export interface RadioButtonProps {
  value: string
  id: string
  label: string
  description?: string
  checked?: boolean
  icon: React.ComponentType<IconProps>
  onPress?: () => void
}

export function RadioButton({
  value,
  id,
  label,
  description,
  checked = false,
  icon: Icon,
  onPress
}: RadioButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: 1, cursor: Platform.OS === 'web' ? 'pointer' : 'auto' }}
    >
      <RadioCard checked={checked}>
        <RadioGroup.Item
          value={value}
          id={id}
          style={{ position: 'absolute', opacity: 0, width: 1, height: 1 }}
        />

        <IconContainer checked={checked}>
          <Icon
            size={28}
            color={checked ? 'white' : '$primary'}
          />
        </IconContainer>

        <YStack gap="$1" items="center">
          <Label
            htmlFor={id}
            fontFamily="$body"
            fontWeight="700"
            fontSize={16}
            color="$color12"
            cursor="pointer"
            text="center"
            pointerEvents="none"
          >
            {label}
          </Label>
          {description && (
            <Label
              htmlFor={id}
              fontFamily="$body"
              fontSize={13}
              color="$color10"
              cursor="pointer"
              text="center"
              lineHeight={18}
              pointerEvents="none"
            >
              {description}
            </Label>
          )}
        </YStack>
      </RadioCard>
    </Pressable>
  )
}
