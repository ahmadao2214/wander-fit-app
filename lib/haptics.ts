import { Platform } from 'react-native'
import * as Haptics from 'expo-haptics'

/**
 * A light tap when the athlete selects something: a choice in the First Run
 * (a sport, a day), or a workout lifted to move it in the Program week. iOS only: Android's light impact is coarse, and web has
 * none. Never throws; a missing haptic engine just means no tap.
 */
export function selectionFeedback(): void {
  if (Platform.OS !== 'ios') return
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
}
