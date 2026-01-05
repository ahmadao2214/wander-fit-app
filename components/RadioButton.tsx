import * as React from 'react'
import { Platform, Pressable } from 'react-native'
import { RadioGroup, Label, XStack, YStack, styled } from 'tamagui'
import type { IconProps } from '@tamagui/lucide-icons'

// Icon-based card container
const RadioCard = styled(YStack, {
  flex: 1,
  gap: '$3',
  padding: '$4',
  borderRadius: '$4',
  borderWidth: 2,
  borderColor: '$borderColor',
  backgroundColor: '$surface',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: 140,

  variants: {
    checked: {
      true: {
        borderColor: '$primary',
        backgroundColor: '$brand2',
      },
      false: {
        borderColor: '$borderColor',
        backgroundColor: '$surface',
      },
    },
  },

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
  borderRadius: '$10',
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    checked: {
      true: {
        backgroundColor: '$primary',
      },
      false: {
        backgroundColor: '$brand2',
      },
    },
  },
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

        <YStack gap="$1" alignItems="center">
          <Label
            htmlFor={id}
            fontFamily="$body"
            fontWeight="700"
            fontSize={16}
            color="$color12"
            cursor="pointer"
            textAlign="center"
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
              textAlign="center"
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
