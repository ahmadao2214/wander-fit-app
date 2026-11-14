import { Label, styled } from 'tamagui'

/**
 * Persistent label above a form field. Placeholders vanish as soon as the
 * person types (and autofill hides them), so every field gets one of these.
 * Pass htmlFor = the input's id: on web it's a real <label>, and pressing it
 * focuses the input. Give the input the same text as accessibilityLabel so
 * VoiceOver reads it too.
 */
export const FieldLabel = styled(Label, {
  fontFamily: '$body',
  fontWeight: '600',
  fontSize: 14,
  lineHeight: 20,
  height: 'auto',
  color: '$color12',
  py: 0,
})
