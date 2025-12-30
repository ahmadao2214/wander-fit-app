import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui, createTokens, createFont } from 'tamagui'
import { 
  blue, blueDark, 
  orange, orangeDark, 
  green, greenDark,
  yellow, yellowDark,
  red, redDark,
  purple, purpleDark,
  cyan, cyanDark,
  gray, grayDark,
  slate, slateDark
} from '@tamagui/colors'

// ═══════════════════════════════════════════════════════════════════════════════
// ATHLETIC MOMENTUM DESIGN SYSTEM
// Youth GPP Training App - Strava-inspired, sporty & bold
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// BRAND COLOR TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const brandColors = {
  // Primary Brand - Electric Blue
  brand1: '#EFF6FF',   // Lightest blue background
  brand2: '#DBEAFE',   // Light blue surface
  brand3: '#BFDBFE',   // Blue highlight
  brand4: '#93C5FD',   // Blue accent light
  brand5: '#60A5FA',   // Blue accent
  brand6: '#3B82F6',   // Blue primary
  brand7: '#2563EB',   // Electric Blue - PRIMARY BRAND COLOR
  brand8: '#1D4ED8',   // Blue pressed
  brand9: '#1E40AF',   // Blue deep
  brand10: '#1E3A8A',  // Blue darker
  brand11: '#172554',  // Blue text on light
  brand12: '#0F172A',  // Deep Navy - Text

  // Secondary - Flame Orange (Energy/Achievements)
  accent1: '#FFF7ED',
  accent2: '#FFEDD5',
  accent3: '#FED7AA',
  accent4: '#FDBA74',
  accent5: '#FB923C',
  accent6: '#F97316',  // Flame Orange - SECONDARY ACCENT
  accent7: '#EA580C',
  accent8: '#C2410C',
  accent9: '#9A3412',
  accent10: '#7C2D12',
  accent11: '#431407',
  accent12: '#1C0A00',
}

// Intensity Colors (Traffic Light System)
const intensityColors = {
  // Low Intensity - Emerald Green (Recovery)
  intensityLow1: '#ECFDF5',
  intensityLow2: '#D1FAE5',
  intensityLow3: '#A7F3D0',
  intensityLow4: '#6EE7B7',
  intensityLow5: '#34D399',
  intensityLow6: '#10B981',  // Emerald - LOW INTENSITY
  intensityLow7: '#059669',
  intensityLow8: '#047857',
  intensityLow9: '#065F46',
  intensityLow10: '#064E3B',
  intensityLow11: '#022C22',
  intensityLow12: '#011613',

  // Medium Intensity - Amber (Moderate)
  intensityMed1: '#FFFBEB',
  intensityMed2: '#FEF3C7',
  intensityMed3: '#FDE68A',
  intensityMed4: '#FCD34D',
  intensityMed5: '#FBBF24',
  intensityMed6: '#F59E0B',  // Amber - MEDIUM INTENSITY
  intensityMed7: '#D97706',
  intensityMed8: '#B45309',
  intensityMed9: '#92400E',
  intensityMed10: '#78350F',
  intensityMed11: '#451A03',
  intensityMed12: '#1C0A00',

  // High Intensity - Coral Red (Peak)
  intensityHigh1: '#FEF2F2',
  intensityHigh2: '#FEE2E2',
  intensityHigh3: '#FECACA',
  intensityHigh4: '#FCA5A5',
  intensityHigh5: '#F87171',
  intensityHigh6: '#EF4444',  // Coral Red - HIGH INTENSITY
  intensityHigh7: '#DC2626',
  intensityHigh8: '#B91C1C',
  intensityHigh9: '#991B1B',
  intensityHigh10: '#7F1D1D',
  intensityHigh11: '#450A0A',
  intensityHigh12: '#1F0505',
}

// GPP Category Accent Tints
const categoryColors = {
  // Category 1: Endurance - Teal
  catEndurance: '#14B8A6',
  catEnduranceLight: '#99F6E4',
  catEnduranceDark: '#0D9488',

  // Category 2: Power - Purple  
  catPower: '#A855F7',
  catPowerLight: '#E9D5FF',
  catPowerDark: '#9333EA',

  // Category 3: Rotation - Orange
  catRotation: '#F97316',
  catRotationLight: '#FFEDD5',
  catRotationDark: '#EA580C',

  // Category 4: Strength - Blue
  catStrength: '#3B82F6',
  catStrengthLight: '#DBEAFE',
  catStrengthDark: '#2563EB',
}

// Semantic Colors
const semanticColors = {
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',
  
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',
  
  error: '#F43F5E',
  errorLight: '#FFE4E6',
  errorDark: '#E11D48',
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOKENS
// ─────────────────────────────────────────────────────────────────────────────

const customTokens = createTokens({
  ...defaultConfig.tokens,
  color: {
    // Brand colors
    ...brandColors,
    // Intensity colors
    ...intensityColors,
    // Category colors
    ...categoryColors,
    // Semantic colors
    ...semanticColors,
    // Base Tamagui colors for compatibility
    ...blue,
    ...orange,
    ...green,
    ...yellow,
    ...red,
    ...purple,
    ...cyan,
    ...gray,
    ...slate,
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// LIGHT THEME
// ─────────────────────────────────────────────────────────────────────────────

const lightTheme = {
  // Base background and surfaces
  background: '#FAFBFC',        // Fresh White
  backgroundHover: '#F1F5F9',
  backgroundPress: '#E2E8F0',
  backgroundFocus: '#F1F5F9',
  backgroundStrong: '#FFFFFF',
  backgroundTransparent: 'rgba(250, 251, 252, 0)',

  // Card and surface colors
  surface: '#FFFFFF',
  surfaceHover: '#F8FAFC',
  surfaceActive: '#F1F5F9',

  // Text colors
  color: '#0F172A',             // Deep Navy - primary text
  colorHover: '#1E293B',
  colorPress: '#334155',
  colorFocus: '#0F172A',
  colorTransparent: 'rgba(15, 23, 42, 0)',

  // Muted/secondary text
  color1: '#F8FAFC',
  color2: '#F1F5F9',
  color3: '#E2E8F0',
  color4: '#CBD5E1',
  color5: '#94A3B8',
  color6: '#64748B',            // Muted Slate - secondary text
  color7: '#475569',
  color8: '#334155',
  color9: '#1E293B',
  color10: '#64748B',           // Secondary text shorthand
  color11: '#334155',           // Strong text
  color12: '#0F172A',           // Primary text

  // Primary brand (Electric Blue)
  primary: '#2563EB',
  primaryHover: '#1D4ED8',
  primaryPress: '#1E40AF',
  primaryFocus: '#2563EB',

  // Accent (Flame Orange)
  accent: '#F97316',
  accentHover: '#EA580C',
  accentPress: '#C2410C',
  accentBackground: '#FFF7ED',

  // Border colors
  borderColor: '#E2E8F0',
  borderColorHover: '#CBD5E1',
  borderColorPress: '#94A3B8',
  borderColorFocus: '#2563EB',

  // Placeholder
  placeholderColor: '#94A3B8',

  // Shadow
  shadowColor: 'rgba(15, 23, 42, 0.08)',
  shadowColorHover: 'rgba(15, 23, 42, 0.12)',

  // Tab bar
  tabActive: '#2563EB',
  tabInactive: '#64748B',

  // Brand colors in theme
  ...brandColors,
  
  // Intensity colors  
  ...intensityColors,

  // Category colors
  ...categoryColors,

  // Semantic
  ...semanticColors,

  // Preserve Tamagui color scales for compatibility
  ...blue,
  ...orange,
  ...green,
  ...yellow,
  ...red,
  ...purple,
  ...cyan,
  ...gray,
  ...slate,
}

// ─────────────────────────────────────────────────────────────────────────────
// DARK THEME
// ─────────────────────────────────────────────────────────────────────────────

const darkTheme = {
  // Base background and surfaces
  background: '#0F172A',        // Deep Navy background
  backgroundHover: '#1E293B',
  backgroundPress: '#334155',
  backgroundFocus: '#1E293B',
  backgroundStrong: '#020617',
  backgroundTransparent: 'rgba(15, 23, 42, 0)',

  // Card and surface colors
  surface: '#1E293B',           // Charcoal cards
  surfaceHover: '#334155',
  surfaceActive: '#475569',

  // Text colors
  color: '#F8FAFC',             // Light text on dark
  colorHover: '#E2E8F0',
  colorPress: '#CBD5E1',
  colorFocus: '#F8FAFC',
  colorTransparent: 'rgba(248, 250, 252, 0)',

  // Muted/secondary text
  color1: '#020617',
  color2: '#0F172A',
  color3: '#1E293B',
  color4: '#334155',
  color5: '#475569',
  color6: '#64748B',            
  color7: '#94A3B8',
  color8: '#CBD5E1',
  color9: '#E2E8F0',
  color10: '#94A3B8',           // Secondary text shorthand
  color11: '#CBD5E1',           // Strong text
  color12: '#F8FAFC',           // Primary text

  // Primary brand (Electric Blue - brighter for dark mode)
  primary: '#3B82F6',
  primaryHover: '#60A5FA',
  primaryPress: '#2563EB',
  primaryFocus: '#3B82F6',

  // Accent (Flame Orange)
  accent: '#FB923C',
  accentHover: '#FDBA74',
  accentPress: '#F97316',
  accentBackground: '#431407',

  // Border colors
  borderColor: '#334155',
  borderColorHover: '#475569',
  borderColorPress: '#64748B',
  borderColorFocus: '#3B82F6',

  // Placeholder
  placeholderColor: '#64748B',

  // Shadow
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  shadowColorHover: 'rgba(0, 0, 0, 0.4)',

  // Tab bar
  tabActive: '#3B82F6',
  tabInactive: '#64748B',

  // Brand colors (adjusted for dark mode)
  brand1: '#0F172A',
  brand2: '#1E293B',
  brand3: '#1E3A8A',
  brand4: '#1E40AF',
  brand5: '#1D4ED8',
  brand6: '#2563EB',
  brand7: '#3B82F6',
  brand8: '#60A5FA',
  brand9: '#93C5FD',
  brand10: '#BFDBFE',
  brand11: '#DBEAFE',
  brand12: '#EFF6FF',

  accent1: '#1C0A00',
  accent2: '#431407',
  accent3: '#7C2D12',
  accent4: '#9A3412',
  accent5: '#C2410C',
  accent6: '#EA580C',
  accent7: '#F97316',
  accent8: '#FB923C',
  accent9: '#FDBA74',
  accent10: '#FED7AA',
  accent11: '#FFEDD5',
  accent12: '#FFF7ED',

  // Intensity colors (adjusted for dark mode)
  intensityLow1: '#011613',
  intensityLow2: '#022C22',
  intensityLow3: '#064E3B',
  intensityLow4: '#065F46',
  intensityLow5: '#047857',
  intensityLow6: '#059669',
  intensityLow7: '#10B981',
  intensityLow8: '#34D399',
  intensityLow9: '#6EE7B7',
  intensityLow10: '#A7F3D0',
  intensityLow11: '#D1FAE5',
  intensityLow12: '#ECFDF5',

  intensityMed1: '#1C0A00',
  intensityMed2: '#451A03',
  intensityMed3: '#78350F',
  intensityMed4: '#92400E',
  intensityMed5: '#B45309',
  intensityMed6: '#D97706',
  intensityMed7: '#F59E0B',
  intensityMed8: '#FBBF24',
  intensityMed9: '#FCD34D',
  intensityMed10: '#FDE68A',
  intensityMed11: '#FEF3C7',
  intensityMed12: '#FFFBEB',

  intensityHigh1: '#1F0505',
  intensityHigh2: '#450A0A',
  intensityHigh3: '#7F1D1D',
  intensityHigh4: '#991B1B',
  intensityHigh5: '#B91C1C',
  intensityHigh6: '#DC2626',
  intensityHigh7: '#EF4444',
  intensityHigh8: '#F87171',
  intensityHigh9: '#FCA5A5',
  intensityHigh10: '#FECACA',
  intensityHigh11: '#FEE2E2',
  intensityHigh12: '#FEF2F2',

  // Category colors (same, work well on dark)
  ...categoryColors,

  // Semantic (adjusted for dark)
  success: '#34D399',
  successLight: '#065F46',
  successDark: '#10B981',
  
  warning: '#FBBF24',
  warningLight: '#78350F',
  warningDark: '#F59E0B',
  
  error: '#FB7185',
  errorLight: '#881337',
  errorDark: '#F43F5E',

  // Tamagui dark color scales
  ...blueDark,
  ...orangeDark,
  ...greenDark,
  ...yellowDark,
  ...redDark,
  ...purpleDark,
  ...cyanDark,
  ...grayDark,
  ...slateDark,
}

// ─────────────────────────────────────────────────────────────────────────────
// INTENSITY SUB-THEMES
// These can wrap workout cards/screens based on selected intensity
// ─────────────────────────────────────────────────────────────────────────────

// Light mode intensity sub-themes
const lightIntensityLow = {
  ...lightTheme,
  background: '#ECFDF5',
  surface: '#D1FAE5',
  primary: '#10B981',
  primaryHover: '#059669',
  primaryPress: '#047857',
  borderColor: '#A7F3D0',
  accent: '#10B981',
}

const lightIntensityMedium = {
  ...lightTheme,
  background: '#FFFBEB',
  surface: '#FEF3C7',
  primary: '#F59E0B',
  primaryHover: '#D97706',
  primaryPress: '#B45309',
  borderColor: '#FDE68A',
  accent: '#F59E0B',
}

const lightIntensityHigh = {
  ...lightTheme,
  background: '#FEF2F2',
  surface: '#FEE2E2',
  primary: '#EF4444',
  primaryHover: '#DC2626',
  primaryPress: '#B91C1C',
  borderColor: '#FECACA',
  accent: '#EF4444',
}

// Dark mode intensity sub-themes
const darkIntensityLow = {
  ...darkTheme,
  background: '#022C22',
  surface: '#064E3B',
  primary: '#10B981',
  primaryHover: '#34D399',
  primaryPress: '#059669',
  borderColor: '#065F46',
  accent: '#10B981',
}

const darkIntensityMedium = {
  ...darkTheme,
  background: '#451A03',
  surface: '#78350F',
  primary: '#F59E0B',
  primaryHover: '#FBBF24',
  primaryPress: '#D97706',
  borderColor: '#92400E',
  accent: '#F59E0B',
}

const darkIntensityHigh = {
  ...darkTheme,
  background: '#450A0A',
  surface: '#7F1D1D',
  primary: '#EF4444',
  primaryHover: '#F87171',
  primaryPress: '#DC2626',
  borderColor: '#991B1B',
  accent: '#EF4444',
}

// ─────────────────────────────────────────────────────────────────────────────
// FONT DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

// Heading font - Bebas Neue for bold, athletic headers
const headingFont = createFont({
  family: 'BebasNeue',
  size: {
    1: 12,
    2: 14,
    3: 16,
    4: 18,
    5: 20,
    6: 24,
    7: 28,
    8: 32,
    9: 40,
    10: 48,
    11: 56,
    12: 64,
    13: 72,
    14: 84,
    15: 96,
    16: 128,
  },
  lineHeight: {
    1: 16,
    2: 18,
    3: 20,
    4: 22,
    5: 24,
    6: 28,
    7: 32,
    8: 36,
    9: 44,
    10: 52,
    11: 60,
    12: 68,
    13: 76,
    14: 88,
    15: 100,
    16: 132,
  },
  weight: {
    4: '400',
  },
  letterSpacing: {
    4: 0.5,
    5: 0.5,
    6: 0.5,
    7: 0.5,
    8: 0.5,
    9: 0.5,
    10: 1,
    11: 1,
    12: 1,
    13: 1,
    14: 1,
    15: 1,
    16: 1,
  },
  face: {
    400: { normal: 'BebasNeue' },
  },
})

// Body font - Plus Jakarta Sans for UI text
const bodyFont = createFont({
  family: 'PlusJakartaSans',
  size: {
    1: 11,
    2: 12,
    3: 13,
    4: 14,
    5: 16,
    6: 18,
    7: 20,
    8: 22,
    9: 26,
    10: 30,
    11: 36,
    12: 42,
    13: 50,
    14: 62,
    15: 72,
    16: 92,
  },
  lineHeight: {
    1: 16,
    2: 18,
    3: 20,
    4: 22,
    5: 24,
    6: 26,
    7: 28,
    8: 30,
    9: 34,
    10: 38,
    11: 44,
    12: 50,
    13: 58,
    14: 70,
    15: 80,
    16: 100,
  },
  weight: {
    1: '400',
    4: '400',
    5: '500',
    6: '600',
    7: '700',
  },
  letterSpacing: {
    4: 0,
    5: 0,
    6: -0.2,
    7: -0.3,
    8: -0.4,
    9: -0.5,
    10: -0.5,
    11: -0.5,
    12: -0.5,
    13: -0.5,
    14: -0.5,
    15: -0.5,
    16: -0.5,
  },
  face: {
    400: { normal: 'PlusJakartaSans' },
    500: { normal: 'PlusJakartaSansMedium' },
    600: { normal: 'PlusJakartaSansSemiBold' },
    700: { normal: 'PlusJakartaSansBold' },
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// FINAL CONFIG
// ─────────────────────────────────────────────────────────────────────────────

const customConfig = {
  ...defaultConfig,
  tokens: customTokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
    // Intensity sub-themes (can be nested under light/dark)
    light_intensity_low: lightIntensityLow,
    light_intensity_medium: lightIntensityMedium,
    light_intensity_high: lightIntensityHigh,
    dark_intensity_low: darkIntensityLow,
    dark_intensity_medium: darkIntensityMedium,
    dark_intensity_high: darkIntensityHigh,
  },
  fonts: {
    ...defaultConfig.fonts,
    heading: headingFont,
    body: bodyFont,
  },
}

export const config = createTamagui(customConfig)

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN SYSTEM EXPORTS
// Convenience exports for using in components
// ─────────────────────────────────────────────────────────────────────────────

// Intensity level type for type-safe usage
export type IntensityLevel = 'low' | 'medium' | 'high'

// Map intensity to theme name
export const intensityThemeMap = {
  low: 'intensity_low',
  medium: 'intensity_medium', 
  high: 'intensity_high',
} as const

// GPP Category IDs to accent colors
export const categoryAccentColors = {
  1: { // Endurance
    primary: categoryColors.catEndurance,
    light: categoryColors.catEnduranceLight,
    dark: categoryColors.catEnduranceDark,
  },
  2: { // Power
    primary: categoryColors.catPower,
    light: categoryColors.catPowerLight,
    dark: categoryColors.catPowerDark,
  },
  3: { // Rotation
    primary: categoryColors.catRotation,
    light: categoryColors.catRotationLight,
    dark: categoryColors.catRotationDark,
  },
  4: { // Strength
    primary: categoryColors.catStrength,
    light: categoryColors.catStrengthLight,
    dark: categoryColors.catStrengthDark,
  },
} as const

// Brand color constants for direct use
export const brandPrimary = '#2563EB'  // Electric Blue
export const brandAccent = '#F97316'   // Flame Orange
export const brandNavy = '#0F172A'     // Deep Navy
