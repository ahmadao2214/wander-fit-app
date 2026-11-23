import { useToastController } from '@tamagui/toast'

/**
 * Wraps Tamagui's toast controller so screens rendered without ToastProvider
 * (such as isolated unit tests) degrade gracefully instead of throwing.
 */
export function useFeedbackToast() {
  try {
    const controller = useToastController()
    return {
      show: (title: string, message?: string) => {
        try {
          controller?.show(title, message ? { message } : undefined)
        } catch {
          // No-op if toast viewport is unavailable
        }
      },
    }
  } catch {
    return {
      show: () => {},
    }
  }
}
