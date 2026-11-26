/**
 * The redesign harness contract: what every direction (a, b, c) must export,
 * and which stories exist. Types and constants only, with no imports, so the
 * Jest node project (lib/__tests__/redesign-tokens.test.ts) and the Storybook
 * preview can both load it.
 *
 * Run 2: the `Direction` axis keeps its values a|b|c but means three layout
 * sets inside look B ("Set 1 · recommended", "Set 2", "Set 3"). Every set
 * shares B's kit in b-reference/, and renders night 1's B screens from there
 * as the reference.
 *
 * Night 1 surfaces and states are copied from
 * wanderfit-redesign/batches/night-1/manifest.json (version 4); run 2's
 * signed-out surfaces match the capture folder names in
 * wanderfit-redesign/capture/ (inventory-run-2.md).
 */

// ---------------------------------------------------------------------------
// Axes

export const DIRECTIONS = ['a', 'b', 'c'] as const
export type Direction = (typeof DIRECTIONS)[number]

export const SCHEMES = ['light', 'dark'] as const
export type Scheme = (typeof SCHEMES)[number]

export const PHASES = ['GPP', 'SPP', 'SSP'] as const
export type Phase = (typeof PHASES)[number]

/** The only expansions the app uses (CONTEXT.md, phase glossary). */
export const PHASE_NAMES: Readonly<Record<Phase, string>> = {
  GPP: 'General Physical Preparedness',
  SPP: 'Specific Physical Preparedness',
  SSP: 'Sport-Specific Preparedness',
}

// ---------------------------------------------------------------------------
// Surfaces and states: night 1 (the B reference), then run 2 (signed out)

export const SURFACE_STATES = {
  today: ['workout day', 'paused', 'completed', 'reassessment pending'],
  program: ['current week'],
  'workout-detail': ['before start'],
  'workout-execute': ['warmup', 'mid exercise', 'last set of an exercise', 'workout complete'],
  'set-edit-sheet': ['open', 'keyboard up'],
  'first-run-welcome': ['default'],
  'first-run-sport': ['default', 'sport selected', 'search no result'],
  'first-run-season': ['default', 'date selected'],
  'first-run-days': ['default', 'several selected'],
  'first-run-about': ['empty', 'filled', 'keyboard up', 'validation'],
  'first-run-reveal': ['plan'],
  'save-plan-sheet': ['open', 'email form', 'keyboard up'],
  'sign-in': ['empty', 'keyboard up', 'validation'],
  paywall: ['concept'],
  splash: ['launch'],
} as const

export type SurfaceId = keyof typeof SURFACE_STATES
export const SURFACE_IDS = Object.keys(SURFACE_STATES) as SurfaceId[]

/** Night 1's surfaces: on this branch, the B reference every set renders from b-reference/. */
export const NIGHT1_SURFACE_IDS = [
  'today',
  'program',
  'workout-detail',
  'workout-execute',
  'set-edit-sheet',
] as const satisfies readonly SurfaceId[]
export type Night1SurfaceId = (typeof NIGHT1_SURFACE_IDS)[number]

/**
 * Run 2's signed-out journey, in order. `--run 2` on proto:check and
 * proto:gallery keeps only these (scripts/proto-check.mjs mirrors this list).
 */
export const RUN2_SURFACE_IDS = [
  'first-run-welcome',
  'first-run-sport',
  'first-run-season',
  'first-run-days',
  'first-run-about',
  'first-run-reveal',
  'save-plan-sheet',
  'sign-in',
  'paywall',
  'splash',
] as const satisfies readonly SurfaceId[]
export type Run2SurfaceId = (typeof RUN2_SURFACE_IDS)[number]

/**
 * Surfaces whose "keyboard up" state must keep the focused field
 * (TEST_IDS.focusedField) and the main button (TEST_IDS.primaryAction) above
 * the keyboard placeholder. The sheets (set-edit-sheet, save-plan-sheet) use
 * the sheet rule instead: nothing in TEST_IDS.sheet under the placeholder.
 */
export const KEYBOARD_FIELD_SURFACES: readonly SurfaceId[] = ['first-run-about', 'sign-in']
/** The state name that draws the keyboard placeholder, on any surface that has it. */
export const KEYBOARD_STATE = 'keyboard up'

/** The states of one surface, e.g. SurfaceState<'today'> = 'workout day' | 'paused' | … */
export type SurfaceState<S extends SurfaceId = SurfaceId> = (typeof SURFACE_STATES)[S][number]

/** Surfaces that show the four-tab bar (the story mounts the direction's TabBar). No run-2 surface has one. */
export const TAB_BAR_SURFACES: readonly SurfaceId[] = ['today', 'program']

/** The tab bar's tabs, in order, and which one each tabbed surface marks active. */
export const TABS = ['Today', 'Program', 'History', 'Profile'] as const
export type Tab = (typeof TABS)[number]
export const ACTIVE_TAB: Partial<Record<SurfaceId, Tab>> = { today: 'Today', program: 'Program' }

/** States rendered in every phase; every other state renders in GPP only. */
export const ALL_PHASE_STATES: readonly { surface: SurfaceId; state: string }[] = [
  { surface: 'today', state: 'workout day' },
  { surface: 'workout-execute', state: 'mid exercise' },
]

/** What every screen component receives. */
export interface ScreenProps<S extends SurfaceId = SurfaceId> {
  state: SurfaceState<S>
  scheme: Scheme
  phase: Phase
}

// ---------------------------------------------------------------------------
// Stories: one per state in GPP, plus the ALL_PHASE_STATES in SPP and SSP.

export interface StorySpec {
  surface: SurfaceId
  state: string
  phase: Phase
  /** Storybook title, "Redesign/<surface>". */
  title: string
  /** Storybook story name, "<state> · <phase>". */
  name: string
  /** File-safe key, "<surface>--<state-with-dashes>--<phase>", lower case. */
  key: string
  /**
   * Storybook's id for the story, from the title and the export name
   * ("WorkoutDayGPP" → "workout-day-gpp"): "redesign-<surface>--<state>-<phase>".
   */
  id: string
}

export const STORY_TITLE_PREFIX = 'Redesign/'

export const STORIES: readonly StorySpec[] = SURFACE_IDS.flatMap((surface) =>
  (SURFACE_STATES[surface] as readonly string[]).flatMap((state) => {
    const allPhases = ALL_PHASE_STATES.some((s) => s.surface === surface && s.state === state)
    return (allPhases ? PHASES : (['GPP'] as const)).map((phase): StorySpec => ({
      surface,
      state,
      phase,
      title: `${STORY_TITLE_PREFIX}${surface}`,
      name: `${state} · ${phase}`,
      key: `${surface}--${state.replaceAll(' ', '-')}--${phase.toLowerCase()}`,
      id: `redesign-${surface}--${state.replaceAll(' ', '-')}-${phase.toLowerCase()}`,
    }))
  })
)

// ---------------------------------------------------------------------------
// Frame and checks

/** iPhone 17 in points: every story renders at this size. */
export const FRAME = { width: 402, height: 874 } as const
/** Dynamic Island top and home-indicator bottom, in points. */
export const FRAME_INSETS = { top: 62, bottom: 34, left: 0, right: 0 } as const
/** The keyboard placeholder every "keyboard up" story draws at the bottom. */
export const KEYBOARD_HEIGHT = 291

/** proto:check fails below these. */
export const MIN_TEXT_PX = 12
export const MIN_TAP_PX = 44
/** WCAG AA for normal text. */
export const MIN_CONTRAST = 4.5

/** shared.md: line height as a multiple of the font size. */
export const LINE_HEIGHT = { display: 1.1, title: 1.25, body: 1.45 } as const
export type Leading = keyof typeof LINE_HEIGHT

/** shared.md: pressed and disabled opacity. No other state colors. */
export const PRESSED_OPACITY = 0.85
export const DISABLED_OPACITY = 0.4

/**
 * testIDs the harness and proto:check rely on.
 * - `screen`: the root of every surface component.
 * - `sheet`: a sheet's own panel (Set Edit, Save plan), not the scrim. In
 *   "keyboard up", no text or tap target inside it may sit under the keyboard
 *   placeholder.
 * - `focusedField` and `primaryAction`: on First Run About and Sign In, the
 *   field that has focus and the main button. In "keyboard up" both must be
 *   present and sit wholly above the keyboard placeholder.
 * - any testID starting `tap-` is measured as a tap target (44×44 or larger).
 */
export const TEST_IDS = {
  frame: 'story-frame',
  screen: 'proto-screen',
  sheet: 'proto-sheet',
  keyboard: 'proto-keyboard',
  tabBar: 'proto-tab-bar',
  focusedField: 'proto-focused-field',
  primaryAction: 'proto-primary-action',
} as const
export const TAP_TEST_ID_PREFIX = 'tap-'

// ---------------------------------------------------------------------------
// Tokens

/** Any color a prototype may write: hex, or rgba() for scrims and shadows. */
export type ProtoColor = `#${string}` | `rgba(${string})`

/**
 * A six-digit hex color, `#rrggbb`. The type checks the `#`; the six digits
 * are checked by lib/__tests__/redesign-tokens.test.ts (a template-literal
 * union of six hex digits is too large for TypeScript).
 */
export type HexColor = `#${string}`

export interface Shadow {
  color: ProtoColor
  /** Offset down, in points. */
  y: number
  blur: number
}

/** The status bar content over a screen (dark = dark icons). */
export type StatusBarStyle = 'dark' | 'light'

/**
 * One scheme's colors. Role names are the direction's own (taken from its
 * token table), so C can have `fieldGPP`, `fieldSPP`… and A and B `tintGPP`….
 * Per-phase roles end in the phase, so `background[`field${phase}`]` types.
 */
export interface SchemeTokens<TextRole extends string = string, BgRole extends string = string> {
  /** Colors used for text and icons. */
  text: Readonly<Record<TextRole, HexColor>>
  /** Colors that text sits on: screens, cards, tiles, sheets, fills, buttons. */
  background: Readonly<Record<BgRole, HexColor>>
  /** Neither text nor a background text sits on: scrims, tracks, shadows' colors. */
  other: Readonly<Record<string, ProtoColor>>
  /** Pairs the direction promises are used together; each must pass WCAG AA (4.5:1). */
  contrastPairs: ReadonlyArray<readonly [TextRole, BgRole]>
  /** Named shadows; `null` where the token table says "none" in this scheme. */
  shadow: Readonly<Record<string, Shadow | null>>
  /** Status bar content, per phase where the field color decides it. */
  statusBar: StatusBarStyle | Readonly<Record<Phase, StatusBarStyle>>
}

export interface Tokens<TextRole extends string = string, BgRole extends string = string> {
  /** "A · Today's look, done well" and so on, for labels. */
  name: string
  /** The scheme the direction is designed in first (B is dark). */
  defaultScheme: Scheme
  light: SchemeTokens<TextRole, BgRole>
  dark: SchemeTokens<TextRole, BgRole>
  /** Type sizes in points. Every direction has the five common roles; extra roles are its own. */
  type: Readonly<
    { title: number; heading: number; body: number; label: number; caption: number } & Record<
      string,
      number
    >
  >
  /** Letter spacing in em, only where the direction file gives it. */
  letterSpacing: Readonly<Record<string, number>>
  /** Corner radii in points. */
  radius: Readonly<Record<string, number>>
  /** The spacing scale in points, smallest first. */
  space: readonly number[]
  /** Screen side gutter in points. */
  gutter: number
  /** Minimum height of a tap target in this direction (44 or more). */
  tapTarget: number
}

// ---------------------------------------------------------------------------
// Fonts

export type FontWeight = '400' | '500' | '600' | '700'

/** One font file the frame loads before a story renders. */
export interface FontFace {
  /** CSS family name the face registers under; unique to the direction. */
  family: string
  weight: FontWeight
  /** The font file's URL, from a `?url` import. */
  url: string
}

/** A direction's fonts: every face to load, and named roles screens use. */
export interface DirectionFonts<Role extends string = string> {
  faces: readonly FontFace[]
  /** e.g. `display`, `body`, `bodyMedium`; each is one of `faces`. */
  roles: Readonly<Record<Role, FontFace>>
}
