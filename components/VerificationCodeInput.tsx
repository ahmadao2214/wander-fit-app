import * as React from 'react'
import { Platform, TextInput, StyleSheet } from 'react-native'
import { XStack, useTheme } from 'tamagui'

// Minimal delay - just enough to let React Native process the state update
const FOCUS_DELAY = 0

export interface VerificationCodeInputProps {
  value: string
  onChange: (value: string) => void
  length?: number
}

export function VerificationCodeInput({
  value,
  onChange,
  length = 6
}: VerificationCodeInputProps) {
  const theme = useTheme()
  // Only track focus state on non-Android platforms to avoid re-render flickering
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
  const inputRefs = React.useRef<(TextInput | null)[]>([])
  // Track if we're in the middle of a focus change to prevent race conditions
  const isFocusingRef = React.useRef(false)
  const prevValueRef = React.useRef(value)

  // When value is cleared externally (e.g., resend code), focus first input
  React.useEffect(() => {
    if (prevValueRef.current.length > 0 && value === '') {
      // Value was cleared, focus first input
      inputRefs.current[0]?.focus()
    }
    prevValueRef.current = value
  }, [value])

  // Create styles using theme values
  const styles = React.useMemo(() => StyleSheet.create({
    input: {
      width: 56,
      height: 64,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: theme.borderColor?.val as string || '#e5e5e5',
      backgroundColor: theme.surface?.val as string || '#f5f5f5',
      textAlign: 'center',
      fontSize: 24,
      fontWeight: '600',
      color: theme.color12?.val as string || '#000',
    },
    inputFocused: {
      borderColor: theme.primary?.val as string || '#2563eb',
    },
    inputFilled: {
      borderColor: theme.primary?.val as string || '#2563eb',
    },
  }), [theme])

  // Split the value into individual digits
  const digits = value.split('').slice(0, length)
  while (digits.length < length) {
    digits.push('')
  }

  // Helper to focus an input safely
  const focusInput = (index: number) => {
    if (isFocusingRef.current) return
    isFocusingRef.current = true

    // Use requestAnimationFrame for smoother focus transitions
    requestAnimationFrame(() => {
      inputRefs.current[index]?.focus()
      isFocusingRef.current = false
    })
  }

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '')

    if (numericText.length === 0) {
      // Handle deletion
      const newDigits = [...digits]
      newDigits[index] = ''
      onChange(newDigits.join(''))
      return
    }

    // Handle paste of multiple digits or typing multiple characters
    if (numericText.length > 1) {
      // When pasting, fill from the first empty box or from the beginning
      const pastedDigits = numericText.split('').slice(0, length)
      const newDigits = new Array(length).fill('')

      pastedDigits.forEach((digit, i) => {
        if (i < length) {
          newDigits[i] = digit
        }
      })

      onChange(newDigits.join(''))

      // Focus the last filled input or the next empty one
      const nextIndex = Math.min(pastedDigits.length, length - 1)
      focusInput(nextIndex)
      return
    }

    // Handle single digit input
    const newDigits = [...digits]
    newDigits[index] = numericText
    onChange(newDigits.join(''))

    // Auto-focus next input immediately
    if (index < length - 1) {
      focusInput(index + 1)
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Current is empty, move to previous and clear it
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        focusInput(index - 1)
      }
    }
  }

  const handleFocus = (index: number) => {
    setFocusedIndex(index)
  }

  const handleBlur = () => {
    setFocusedIndex(null)
  }

  // On Android, don't apply dynamic styles to prevent re-render flickering
  const getInputStyle = (index: number, digit: string) => {
    if (Platform.OS === 'android') {
      // On Android, just use filled style if there's a digit, otherwise base style
      return digit ? [styles.input, styles.inputFilled] : styles.input
    }
    // On other platforms, apply focus and filled styles dynamically
    return [
      styles.input,
      focusedIndex === index && styles.inputFocused,
      digit && styles.inputFilled,
    ]
  }

  return (
    <XStack gap="$3" justifyContent="center">
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref
          }}
          style={getInputStyle(index, digit)}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          onBlur={handleBlur}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          caretHidden={Platform.OS === 'ios'}
          maxLength={6}
        />
      ))}
    </XStack>
  )
}
