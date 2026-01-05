import * as React from 'react'
import { Platform, TextInput } from 'react-native'
import { XStack, styled } from 'tamagui'

const DigitInput = styled(TextInput, {
  width: 56,
  height: 64,
  borderRadius: '$3',
  borderWidth: 2,
  borderColor: '$borderColor',
  backgroundColor: '$surface',
  textAlign: 'center',
  fontSize: 24,
  fontWeight: '600',
  fontFamily: '$body',
  color: '$color12',

  variants: {
    focused: {
      true: {
        borderColor: '$primary',
        borderWidth: 2,
      },
    },
    filled: {
      true: {
        borderColor: '$primary',
      },
    },
  },

  ...(Platform.OS === 'web' && {
    outlineStyle: 'none',
  }),
})

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
  const [focusedIndex, setFocusedIndex] = React.useState<number | null>(null)
  const inputRefs = React.useRef<(TextInput | null)[]>([])

  // Split the value into individual digits
  const digits = value.split('').slice(0, length)
  while (digits.length < length) {
    digits.push('')
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

      // Focus the last filled input
      const nextIndex = Math.min(pastedDigits.length - 1, length - 1)
      setTimeout(() => {
        inputRefs.current[nextIndex]?.focus()
      }, 10)
      return
    }

    // Handle single digit input
    const newDigits = [...digits]
    newDigits[index] = numericText
    onChange(newDigits.join(''))

    // Auto-focus next input
    if (index < length - 1) {
      setTimeout(() => {
        inputRefs.current[index + 1]?.focus()
      }, 10)
    }
  }

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleFocus = (index: number) => {
    setFocusedIndex(index)
    // Select all text when focusing (helps with paste and overwrites)
    setTimeout(() => {
      inputRefs.current[index]?.setNativeProps?.({
        selection: { start: 0, end: 1 }
      })
    }, 0)
  }

  return (
    <XStack gap="$3" justifyContent="center">
      {digits.map((digit, index) => (
        <DigitInput
          key={index}
          ref={(ref) => {
            inputRefs.current[index] = ref
          }}
          value={digit}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(e) => handleKeyPress(e, index)}
          onFocus={() => handleFocus(index)}
          onBlur={() => setFocusedIndex(null)}
          focused={focusedIndex === index}
          filled={!!digit}
          keyboardType="number-pad"
          selectTextOnFocus
          autoComplete="one-time-code"
          caretHidden
        />
      ))}
    </XStack>
  )
}
