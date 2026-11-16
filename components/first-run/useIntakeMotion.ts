import { Platform } from 'react-native'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { intakeMotion, type IntakeMotion } from './intakeMotion'

export function useIntakeMotion(): IntakeMotion {
  return intakeMotion(Platform.OS, useReducedMotion())
}
