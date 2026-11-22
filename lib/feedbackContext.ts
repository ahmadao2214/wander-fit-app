import { Platform } from 'react-native'
import Constants from 'expo-constants'
import type { Phase, SkillLevel } from '../types'

export type FeedbackPlatform = 'ios' | 'android' | 'web'
export type FeedbackColorScheme = 'light' | 'dark'

export interface FeedbackProgramContext {
  phase: Phase
  week: number
  day: number
  skillLevel: SkillLevel
}

export interface FeedbackContext {
  platform: FeedbackPlatform
  osVersion?: string
  appVersion: string
  buildNumber?: string
  screenRoute: string
  colorScheme?: FeedbackColorScheme
  programContext?: FeedbackProgramContext
}

function resolvePlatform(): FeedbackPlatform {
  if (Platform.OS === 'ios') return 'ios'
  if (Platform.OS === 'android') return 'android'
  return 'web'
}

function resolveOsVersion(platform: FeedbackPlatform): string | undefined {
  if (platform === 'web') return undefined
  const version = Platform.Version
  if (version === undefined || version === null) return undefined
  const str = String(version).trim()
  return str.length > 0 ? str.slice(0, 64) : undefined
}

function resolveBuildNumber(platform: FeedbackPlatform): string | undefined {
  const expoConfig = Constants.expoConfig
  if (!expoConfig) return undefined
  if (platform === 'ios' && expoConfig.ios?.buildNumber) {
    return String(expoConfig.ios.buildNumber).slice(0, 32)
  }
  if (platform === 'android' && expoConfig.android?.versionCode !== undefined) {
    return String(expoConfig.android.versionCode).slice(0, 32)
  }
  return undefined
}

/**
 * Collects zero-PII technical context using already-installed React Native
 * and expo-constants primitives (zero extra native modules required).
 */
export function buildFeedbackContext(params: {
  screenRoute: string
  colorScheme?: 'light' | 'dark' | null
  programContext?: FeedbackProgramContext
}): FeedbackContext {
  const platform = resolvePlatform()
  const appVersion = Constants.expoConfig?.version ?? 'unknown'
  const osVersion = resolveOsVersion(platform)
  const buildNumber = resolveBuildNumber(platform)
  const screenRoute = params.screenRoute.trim().slice(0, 120) || 'unknown'

  const context: FeedbackContext = {
    platform,
    appVersion: String(appVersion).slice(0, 32),
    screenRoute,
  }

  if (osVersion) context.osVersion = osVersion
  if (buildNumber) context.buildNumber = buildNumber
  if (params.colorScheme === 'light' || params.colorScheme === 'dark') {
    context.colorScheme = params.colorScheme
  }
  if (params.programContext) {
    context.programContext = params.programContext
  }

  return context
}
