import { tokens as reference } from '../b-reference/tokens'

// The play: B's tokens, unchanged (b-reference/tokens.ts is the single source;
// the shared tokens test holds every set to it). Only the name differs. The
// board and sport colours are this set's own, in ./colors.ts.
type Reference = typeof reference
export const tokens: Reference = { ...reference, name: 'Play' }
