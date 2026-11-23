# Profile refresh: name leads

Status: approved by Azhar on 2026-11-23, all four recommendations accepted. Start after Thread C (Legal, Privacy & Store Compliance) completes; rebase on main first. Base: `origin/main` at `3aa4794` (after #164 and #165).

## Goal

Make Profile the athlete's own page. A navy header runs to the top of the screen, the athlete's name is the page title, and the program's three phases sit under it. Everything below becomes one row style. App settings is restyled to the same rows. No feature is added or removed.

Picked from the mockup rounds on 2026-11-23: Athlete card, then Bleed + Phases, then "Name leads".

## What changes

### Profile (`app/(athlete)/profile.tsx`)

1. **Header.** Replaces the `$brand1` card and the blue avatar disc.
   - Navy (`$brand12`) from the top of the screen, behind the status bar. Content starts at `insets.top + 16`.
   - Name in the heading font (Bebas Neue), 48/46, wraps to two lines, never truncates.
   - One supporting line: skill level and sport ("Moderate · Track & Field (Throws)"). The orange trophy line goes.
   - Phase line: full phase name on the left, "Week 3 of 12" on the right in tabular figures.
   - Phase track: three segments, GPP, SPP, SSP. The current phase fills to `week / weeksPerPhase`; earlier phases are full, later ones empty. Under each: the short name and "Week 3 of 4" or "4 weeks".
   - Light status bar text on this screen only.
2. **Maxes.** A white card that overlaps the bottom edge of the header, three tiles: the number with its unit ("245 lb"), the lift name under it. A lift with no max reads "Add". Each tile opens the existing `OneRepMaxSheet` and keeps `testID="max-row-<slug>"`.
3. **Training.** One group of label and value rows, no icons: GPP category, Training days, Experience, Last assessment, Email. Sport, skill level, phase and position leave this list because the header now says them. Program duration leaves because "Week 3 of 12" says it.
4. **Learn, Feedback & support, App settings.** Same rows as today, same copy, same test ids (`feedback-row-rate`, `feedback-row-bug`, `feedback-row-feature`, `profile-app-settings`). One icon style for all of them, the one App settings already ships (#164): a bare 18pt icon in `$color10`, no tile. The orange and blue tinted discs go.
5. **Sign out.** Unchanged.

### App settings (`app/(athlete)/settings.tsx`)

Layout only. Since #164 the screen has five groups: Privacy (two switches), Use with Claude, Support & Legal (four rows), Account (Delete account). All stay. Section labels take the same small label style as Profile, and the two privacy switches become rows in one group. Support & Legal and Account already use the row this spec standardises on, so they only change with the shared component. Copy, behaviour and test ids stay (`settings-support`, `settings-privacy`, `settings-terms`, `settings-disclaimer`, `settings-delete-account`, `mcp-address*`).

### Shared pieces

- `components/profile/PhaseTrack.tsx`: the three-segment track. Pure layout from `phase`, `week`, `weeksPerPhase`.
- `components/settings/SettingsRow.tsx`: the `SettingsRow` that lives inside `app/(athlete)/settings.tsx` today, moved out and extended. Existing props keep working (`icon`, `label`, `onPress`, `external`, `tone`, `testID`). New, all optional: `supporting` (second line), `value` (trailing text), `trailing` (a control such as a switch, replaces the chevron), and no `onPress` means a plain fact row with no press state and no button role.
- `components/settings/SettingsGroup.tsx`: the card with hairline separators that wraps rows, with an optional label above.
- `lib/profile.ts`: `phaseTrack(phase, week, weeksPerPhase, totalProgramWeeks)` returns the three fills and labels, and the overall week number.

## Data

Everything is already returned by `api.userPrograms.getCurrentProgramState`: `phase`, `week`, `day`, `weeksPerPhase`, `totalProgramWeeks`, `skillLevel`, `sportName`, `categoryName`. No Convex change, no schema change.

- `weeksPerPhase` null: fall back to `DEFAULT_WEEKS_PER_PHASE` (4), as the server does.
- Overall week: `(phaseIndex * weeksPerPhase) + week`.
- No program yet: the header shows the name and email only; no phase line, no track, no maxes card.

## Decisions (recommendations accepted 2026-11-23)

1. **This reverses a recorded rule.** `app/__tests__/profile-progress.test.tsx` asserts Profile "shows no progress scoreboard" and states the baseline "in words, not a 0 tile". The phase track is program position, not workouts done, so the first test still passes as written. The maxes tiles are stat tiles, which is what the second rule was written against. Recommendation: keep both tests, and allow the tiles because a max is a number the athlete entered, not a score. An unset max reads "Add", never "0".
2. **Dark theme.** Navy on the navy dark background has no edge. Recommendation: in dark, the header uses `$backgroundStrong` (`#020617`) and the maxes card uses `$surface`.
3. **Email.** It moves from the header to the last Training row. Alternative: a supporting line under the name.
4. **Not in scope.** Units, Appearance and Workout reminders appeared in early mockups and do not exist. Each is its own feature. (Privacy policy and Delete account shipped in #164 and stay as they are.)

## Tests

- `lib/__tests__/profile.test.ts`: `phaseTrack` for each phase, week 1, last week, null `weeksPerPhase`, week past the phase length.
- `components/profile/__tests__/PhaseTrack.test.tsx`: renders three segments, marks the current one, labels read correctly.
- `app/__tests__/profile-progress.test.tsx`, `profile-feedback.test.tsx`, `athlete-settings.test.tsx`, `settings.test.tsx`, `settings-telemetry.test.tsx`: update for the new header and rows; the two rules above stay asserted.
- Journeys: `feedback`, `app-settings`, `settings-telemetry`, `settings-legal` flows and their feature-map entries change only if a selector they use changes. The header is a changed journey surface for `app-settings`, so its flow asserts the name and the phase line.

## Slices

| # | Slice | Owner | Files |
|---|-------|-------|-------|
| 1 | `phaseTrack` and `PhaseTrack` with tests | Builder A | `lib/profile.ts`, `components/profile/*` |
| 2 | `SettingsRow`, `SettingsGroup` and the App settings restyle | Builder B | `components/settings/SettingsRow.tsx`, `components/settings/SettingsGroup.tsx`, `components/settings/TelemetryPreferencesCard.tsx`, `app/(athlete)/settings.tsx`, their tests |
| 3 | Profile header, maxes card, rows, status bar, dark theme | Lead, after 1 and 2 merge into the feature branch | `app/(athlete)/profile.tsx`, its tests, Maestro flows |

Slices 1 and 2 touch different files and run in parallel. Slice 3 waits for both.

## Done when

- `bun run test:ci` and `bun run typecheck` pass in the worktree.
- The web E2E flows `feedback`, `app-settings`, `settings-telemetry` and `settings-legal` pass.
- Profile and App settings are shown working on the iPhone 17 simulator in light and dark, with a two-line name and one unset max.
- An `emil-ui-review` pass on the rendered web and simulator screens is attached, then Astra's review.

## Reference

Mockup: `profile-name-leads.html` from the 2026-11-23 thread (interactive; light theme only; supporting copy under the switches is placeholder, the app's real copy stays).
