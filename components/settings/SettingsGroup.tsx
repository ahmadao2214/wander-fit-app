import { Children, Fragment, isValidElement } from 'react'
import type { ReactNode } from 'react'
import { Card, Separator, YStack } from 'tamagui'
import { Caption, SectionTitle } from '../Typography'

export interface SettingsGroupProps {
  /** Heading above the card. VoiceOver announces it as a heading. */
  label?: string
  /** Note under the card. */
  footer?: string
  children: ReactNode
  testID?: string
}

/**
 * A card of settings rows with a hairline between each row. Null and false
 * children are skipped, so a conditional row never leaves a stray line.
 */
export function SettingsGroup({ label, footer, children, testID }: SettingsGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement)

  return (
    <YStack gap="$3" testID={testID}>
      {label ? <SectionTitle>{label}</SectionTitle> : null}
      <Card bg="$surface" rounded="$4" borderWidth={1} borderColor="$borderColor" overflow="hidden">
        {rows.map((row, index) => (
          <Fragment key={row.key ?? index}>
            {index > 0 ? <Separator borderColor="$borderColor" /> : null}
            {row}
          </Fragment>
        ))}
      </Card>
      {footer ? <Caption>{footer}</Caption> : null}
    </YStack>
  )
}
