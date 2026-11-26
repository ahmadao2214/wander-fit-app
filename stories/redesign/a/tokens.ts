import { tokens as reference } from '../b-reference/tokens'

// Set 1: B's tokens, unchanged (b-reference/tokens.ts is the single source).
// Only the name differs, for the Storybook toolbar and labels.
type Reference = typeof reference
export const tokens: Reference = { ...reference, name: 'Set 1 · recommended' }
