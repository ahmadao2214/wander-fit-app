import { Platform } from 'react-native'

/**
 * Policy-compliant native App Store / Google Play review prompt wrapper.
 *
 * Kept strictly independent from private in-app star ratings.
 * Disabled on web and behind `EXPO_PUBLIC_ENABLE_STORE_REVIEW === 'true'`
 * so TestFlight Pilot builds don't surface Apple's disabled-submit review modal.
 */

export function isStoreReviewEnabledByEnv(): boolean {
  if (Platform.OS === 'web') return false
  return process.env.EXPO_PUBLIC_ENABLE_STORE_REVIEW === 'true'
}

/**
 * Invokes native OS store review dialog if enabled and available.
 * Fails silently if the native module isn't linked in an older dev client binary.
 * Returns `true` when `requestReview()` was actually invoked.
 */
export async function requestNativeStoreReview(options?: {
  shouldProceed?: () => boolean
}): Promise<boolean> {
  if (!isStoreReviewEnabledByEnv()) return false

  try {
    // Dynamic require avoids crashing older dev-client builds before the next EAS native build
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StoreReview = require('expo-store-review') as {
      isAvailableAsync?: () => Promise<boolean>
      requestReview?: () => Promise<void>
    }
    if (
      typeof StoreReview?.isAvailableAsync !== 'function' ||
      typeof StoreReview?.requestReview !== 'function'
    ) {
      return false
    }
    const available = await StoreReview.isAvailableAsync()
    if (!available) return false
    if (options?.shouldProceed && !options.shouldProceed()) return false

    await StoreReview.requestReview()
    return true
  } catch {
    return false
  }
}
