import type { ReactNode } from 'react'
import { XStack, YStack } from 'tamagui'
import type { ColorTokens } from 'tamagui'
import { ChevronRight, ExternalLink } from '@tamagui/lucide-icons'
import type { LifeBuoy } from '@tamagui/lucide-icons'
import { Body, Supporting, numeric } from '../Typography'

type IconComponent = typeof LifeBuoy

export interface SettingsRowProps {
  /** Bare 18pt leading icon. Without one, the label starts at the row's padding. */
  icon?: IconComponent
  label: string
  /** Second line under the label. */
  supporting?: string
  /** Test id for the supporting line, for rows whose copy changes with state. */
  supportingTestID?: string
  /** Trailing text before the chevron, e.g. a setting's current value. */
  value?: string
  /** Tabular figures for a numeric value. */
  valueNumeric?: boolean
  /** A control such as a Switch. Replaces the chevron. */
  trailing?: ReactNode
  /** Without it the row is a plain fact row: no press state, no button role. */
  onPress?: () => void
  /** Opens a web page: external-link icon, and VoiceOver says so. */
  external?: boolean
  tone?: ColorTokens
  testID?: string
}

/**
 * One row in a settings group: an optional icon, the label (and a supporting
 * line), then a value, a control, or where the row goes.
 */
export function SettingsRow({
  icon: Icon,
  label,
  supporting,
  supportingTestID,
  value,
  valueNumeric = false,
  trailing,
  onPress,
  external = false,
  tone = '$color12',
  testID,
}: SettingsRowProps) {
  const pressable = onPress !== undefined
  const Chevron = external ? ExternalLink : ChevronRight

  // A pressable row reads as one button. A fact row reads label and value
  // together. A row with a control leaves the control as its own element.
  const factRow = !pressable && trailing === undefined
  const ariaLabel = pressable
    ? external
      ? `${label}, opens in browser`
      : label
    : factRow
      ? value
        ? `${label}, ${value}`
        : label
      : undefined

  return (
    <XStack
      minH={52}
      px="$4"
      py="$3"
      gap="$3"
      items="center"
      pressStyle={pressable ? { bg: '$surfaceHover' } : undefined}
      onPress={onPress}
      role={pressable ? 'button' : undefined}
      accessible={factRow ? true : undefined}
      aria-label={ariaLabel}
      testID={testID}
    >
      {Icon ? <Icon size={18} color={tone === '$color12' ? '$color10' : tone} /> : null}
      <YStack flex={1} minW="40%" gap="$1">
        <Body fontWeight="500" color={tone}>
          {label}
        </Body>
        {supporting ? (
          <Supporting color="$color10" testID={supportingTestID}>
            {supporting}
          </Supporting>
        ) : null}
      </YStack>
      {value ? (
        <Body
          color="$color10"
          numberOfLines={1}
          shrink={1}
          text="right"
          {...(valueNumeric ? numeric : null)}
        >
          {value}
        </Body>
      ) : null}
      {trailing !== undefined ? (
        trailing
      ) : pressable ? (
        <Chevron size={external ? 16 : 20} color="$color9" />
      ) : null}
    </XStack>
  )
}
