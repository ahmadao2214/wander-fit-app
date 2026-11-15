import React from 'react'
import { GetProps, Text, styled } from 'tamagui'
import { TYPE_SCALE, MIN_FONT_SIZE } from '../lib/typeScale'

export { TYPE_SCALE, MIN_FONT_SIZE }

/**
 * Type roles for the athlete app (design audit F08).
 *
 * Six roles, each with a size and a unitless-equivalent line height in points:
 *
 * | Role         | Size/leading | Use                                                  |
 * |--------------|--------------|------------------------------------------------------|
 * | Display      | 28/34        | One per screen: the tab title or the exercise name   |
 * | Title        | 24/30        | A person's name or a detail screen's heading         |
 * | SectionTitle | 18/24        | A group of content on a screen ("Training info")     |
 * | Body         | 16/24        | Values, rows and controls                            |
 * | Supporting   | 14/20        | Secondary lines under a row or value                 |
 * | Caption      | 12/16        | Nonessential notes; never below 12                   |
 *
 * Display is the condensed athletic face (Bebas Neue), kept as a signature
 * for one moment per screen. Everything else is Plus Jakarta Sans in
 * sentence case: no stacked caps and no small tracked labels.
 *
 * Numbers that change (timers, loads, counts) use `numeric` for
 * fixed-width digits so they don't jitter.
 */

/** Fixed-width digits for values that change while you look at them. */
export const numeric = { fontVariant: ['tabular-nums' as const] }

export const Display = styled(Text, {
  name: 'Display',
  fontFamily: '$heading',
  fontSize: TYPE_SCALE.display.size,
  lineHeight: TYPE_SCALE.display.lineHeight,
  letterSpacing: 0.5,
  color: '$color12',
})

export const Title = styled(Text, {
  name: 'Title',
  fontFamily: '$body',
  fontWeight: '700',
  fontSize: TYPE_SCALE.title.size,
  lineHeight: TYPE_SCALE.title.lineHeight,
  color: '$color12',
})

const SectionTitleText = styled(Text, {
  name: 'SectionTitle',
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: TYPE_SCALE.section.size,
  lineHeight: TYPE_SCALE.section.lineHeight,
  color: '$color12',
})

/** A section heading. VoiceOver announces it as a heading. */
export function SectionTitle(props: GetProps<typeof SectionTitleText>) {
  return <SectionTitleText accessibilityRole="header" {...props} />
}

export const Body = styled(Text, {
  name: 'Body',
  fontFamily: '$body',
  fontSize: TYPE_SCALE.body.size,
  lineHeight: TYPE_SCALE.body.lineHeight,
  color: '$color12',
})

export const Supporting = styled(Text, {
  name: 'Supporting',
  fontFamily: '$body',
  fontSize: TYPE_SCALE.supporting.size,
  lineHeight: TYPE_SCALE.supporting.lineHeight,
  color: '$color11',
})

export const Caption = styled(Text, {
  name: 'Caption',
  fontFamily: '$body',
  fontSize: TYPE_SCALE.caption.size,
  lineHeight: TYPE_SCALE.caption.lineHeight,
  color: '$color10',
})
