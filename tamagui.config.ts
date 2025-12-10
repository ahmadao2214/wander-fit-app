import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { orange, orangeDark, purple, purpleDark } from '@tamagui/colors'

// Extend default config with additional color palettes
const customConfig = {
  ...defaultConfig,
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...defaultConfig.tokens.color,
      // Add orange palette
      ...orange,
      // Add purple palette  
      ...purple,
    },
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      // Light theme orange tokens
      orange1: orange.orange1,
      orange2: orange.orange2,
      orange3: orange.orange3,
      orange4: orange.orange4,
      orange5: orange.orange5,
      orange6: orange.orange6,
      orange7: orange.orange7,
      orange8: orange.orange8,
      orange9: orange.orange9,
      orange10: orange.orange10,
      orange11: orange.orange11,
      orange12: orange.orange12,
      // Light theme purple tokens
      purple1: purple.purple1,
      purple2: purple.purple2,
      purple3: purple.purple3,
      purple4: purple.purple4,
      purple5: purple.purple5,
      purple6: purple.purple6,
      purple7: purple.purple7,
      purple8: purple.purple8,
      purple9: purple.purple9,
      purple10: purple.purple10,
      purple11: purple.purple11,
      purple12: purple.purple12,
    },
    dark: {
      ...defaultConfig.themes.dark,
      // Dark theme orange tokens
      orange1: orangeDark.orange1,
      orange2: orangeDark.orange2,
      orange3: orangeDark.orange3,
      orange4: orangeDark.orange4,
      orange5: orangeDark.orange5,
      orange6: orangeDark.orange6,
      orange7: orangeDark.orange7,
      orange8: orangeDark.orange8,
      orange9: orangeDark.orange9,
      orange10: orangeDark.orange10,
      orange11: orangeDark.orange11,
      orange12: orangeDark.orange12,
      // Dark theme purple tokens
      purple1: purpleDark.purple1,
      purple2: purpleDark.purple2,
      purple3: purpleDark.purple3,
      purple4: purpleDark.purple4,
      purple5: purpleDark.purple5,
      purple6: purpleDark.purple6,
      purple7: purpleDark.purple7,
      purple8: purpleDark.purple8,
      purple9: purpleDark.purple9,
      purple10: purpleDark.purple10,
      purple11: purpleDark.purple11,
      purple12: purpleDark.purple12,
    },
  },
}

export const config = createTamagui(customConfig)

export default config

export type Conf = typeof config

declare module 'tamagui' {
  interface TamaguiCustomConfig extends Conf {}
}
