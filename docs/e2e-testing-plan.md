# E2E Testing Plan

> **Status:** approved plan, resolved through a `/grill-with-docs` session (5 rounds). Nothing is built yet.
> **Decisions of record:** [ADR-0001](adr/0001-maestro-only-e2e-with-web-beta-as-pr-gate.md) Maestro only · [ADR-0002](adr/0002-e2e-isolated-backend-and-per-run-users.md) isolated backend and per-run users · [ADR-0003](adr/0003-native-e2e-on-github-actions-not-eas-workflows.md) native E2E on GitHub Actions · [ADR-0004](adr/0004-jest-is-the-only-unit-test-runner.md) Jest only.
> **Vocabulary:** [GLOSSARY.md](../GLOSSARY.md). We say *athlete*, not *client*.

## 1. What this is for

One E2E harness with two consumers:

1. **CI**: the first of the three brakes in Matt Pocock's software-factory model (automated checks → automated review → human review). Every PR must pass it before a human reviews it.
2. **Agents**: the control adapter PStack's `/create-verification-skill` needs. It gives an agent a scripted way to launch Wander-Fit, drive it the way an athlete does, and capture evidence of what happened.

Both run the same Maestro flows.

## 2. Core flows, ranked

Ranked by business importance × risk. All paths are under `app/`.

| # | Flow | Why it ranks here | Screens | Convex writes |
|---|------|-------------------|---------|---------------|
| 1 | **Sign-in → Today → sign-out** | Gate to everything. `useAuth` keys off Clerk, not Convex auth, so Today can briefly flash the "COMPLETE YOUR SETUP" state | `(auth)/sign-in`, `index`, `(athlete)/index`, `(athlete)/profile` | none (`users.getCurrentUser` read) |
| 2 | **Sign-up → intake** | Account creation. Two recent bug-fix commits touched it (captcha, verification loop) | `(auth)/sign-up` (form, verification, COMPLETE SETUP) | `users.createUser` (+ `invitations.acceptInvitation` if invited) |
| 3 | **Activation: intake → commitment → Today** | The only path to an active athlete, with the most writes | `(intake)/sport, age-group, experience-years, training-days, season-timeline, maxes, results`, `(onboarding)/why-it-works, commitment` | `userMaxes.setMultipleMaxes`, `userPrograms.completeIntake` (intake_responses + user_programs), `onboarding.completeOnboarding` |
| 4 | **Workout loop: start → complete sets → finish** | Daily value. `execute/[id]` is the most complex screen, and finishing advances the program | `(athlete)/index`, `workout/[id]`, `workout/execute/[id]` | `scheduleOverrides.setTodayFocus`, `gppWorkoutSessions.startSession / updateProgress / completeSession`, `userPrograms.advanceToNextDay` |
| 5 | **Reassessment at phase end** | Unlocks SPP and SSP. Rare, so regressions here go unnoticed | `(reassessment)/celebration, self-assessment, maxes, results` | `userMaxes.setMultipleMaxes`, `userPrograms.completeReassessment` |
| 6 | Edit a max from Profile | Drives every scaled weight | `(athlete)/profile` + `OneRepMaxSheet` | `userMaxes.setMaxBySlug` |
| 7 | Abandon / resume a session | Risk of losing data | `execute/[id]` exit dialog, Today "Resume" | `gppWorkoutSessions.abandonSession` |
| 8 | Program calendar → workout detail | Read path | `(athlete)/program` | none on web |
| 9 | Edit a set (long-press sheet) | Local state, saved by a debounced `updateProgress` | `components/workout/SetEditSheet.tsx` | via `updateProgress` |
| 10 | History | **Currently broken:** it reads the legacy `workoutSessions` table, not `gpp_workout_sessions` | `(athlete)/history` | none |

**Out of scope:**
- Legacy `(trainer)`, `(client)` and `add-client` screens: unreachable through normal routing, and mostly stubs.
- Google SSO: needs a real OAuth redirect.
- Calendar drag-to-reschedule: native-only gesture.

**Routing facts the flows rely on:**
- `app/index.tsx` and `components/AuthGuard.tsx` route an athlete like this:
  - signed out → `/(auth)/sign-in`
  - Clerk user without a Convex user → `/(auth)/sign-up` "COMPLETE SETUP"
  - no `intakeCompletedAt` → `/(intake)/sport`
  - intake done but onboarding not done → `/(onboarding)`
  - otherwise → `/(athlete)`
- `(reassessment)` has no guard and is reached only through banners and prompts.
- `lib/authGuard.ts` and `lib/authState.ts` are **not used at runtime**. Their tests cover dead code (follow-up ticket in §10).

## 3. Tools

**Maestro is the only E2E tool** (ADR-0001). One set of flows runs on three targets:

| Target | Runs on | When | Purpose |
|---|---|---|---|
| **Web** (Maestro's beta web mode, headless Chromium, against the static web export) | GitHub Actions `ubuntu-latest` | every PR and every push to `main` | Fast gate (budget: 10 min). Also the agents' harness: cloud containers have Chromium but no simulators |
| **Android** (emulator) | GitHub Actions `ubuntu-latest` with KVM | every push to `main` + nightly | Native gestures, secure store, real React Native rendering |
| **iOS** (Simulator) | GitHub Actions `macos-latest` | nightly + before a release | Same |

**Why not the alternatives:**
- **Playwright:** better on the web, but it would be a second suite to keep in sync.
- **Detox:** heavy to set up for Expo.
- **EAS Workflows `maestro` jobs:** not included in the EAS Free plan.
- **Maestro Cloud:** paid.
- **Cost:** the repo is public, so standard GitHub-hosted runners, macOS included, cost nothing.

**Spike results** (run in a Claude Code cloud container, 2026-10-22 to 24):
- Maestro 2.11.0 drove the web export's sign-in screen, captured named screenshots, and recorded an `.mp4`.
- **Pin Chrome to the version Maestro's bundled DevTools support.** 2.11.0 ships DevTools for Chrome 145–147. With Selenium's default Chrome 156, the run failed at `startRecording`. Set `SE_BROWSER_VERSION=147`, and upgrade Maestro and Chrome together.
- Two quirks applied only to the container, not to GitHub runners:
  - Chrome refuses to run as root without `--no-sandbox`.
  - A stale `chromedriver` on `PATH` shadowed the right one.
- `longPressOn` holds for 3 s, which is enough for the 2 s hold-to-commit on native. It's **unverified on web** and is the first thing Flow 3 tests.

**Selectors:**
- Use visible text where it's stable: "Sign In", "Start Workout", "Continue to Check-In".
- Add `testID`s where there's no stable text: sport tiles (`sport-tile-<slug>`), set pills (`set-pill-<exercise>-<set>`, plus a `set-pill-pending` marker), the commit button (`commit-hold-button`), reassessment options, and the Today workout card (`today-workout-card`).
- React Native Web renders `testID` as `data-testid`, and Maestro matches `id:` on native. Confirming that Maestro web matches the same `id:` is a Phase 1 check.

## 4. Test data

**Backend (ADR-0002):**
- A separate **free Convex project, `wander-fit-e2e`**.
- On every run, CI deploys the PR's `convex/` to it with `npx convex deploy` and an E2E deploy key, then seeds it. Seeding is idempotent: `seed:seedAll`, then `generateTemplates:generateAllTemplates`.
- One GitHub concurrency group (`e2e-backend`) runs all E2E jobs one at a time, so two PRs never share the backend mid-run.
- The deployment the app builds use (`fleet-mallard-22`) is never touched by tests.

**Auth:**
- The existing Clerk **Development** instance is now dev/test only.
- **Bot sign-up protection is turned off** on it, because Maestro can't inject Clerk testing tokens.
- Production moves to a Clerk **Production** instance before launch (§10).
- Test emails use `+clerk_test`, and the verification code is always `424242`.

**Users are created fresh for each flow and deleted afterwards.** The lever is `scripts/e2e/persona.ts`, run with bun, with JSON output for agents:

```
persona create --state <new|needs-intake|onboarded|phase-end> --json
  → { email, password, clerkUserId, convexUserId }
persona inspect <email> --json   # read-only: user, program phase/week/day, sessions
persona delete <email>           # Clerk user + all Convex rows
persona sweep --older-than 2h [--dry-run]   # removes leaked e2e-* users
```

**How `create` works:**
1. It creates the Clerk user through the Backend API (`CLERK_SECRET_KEY`), with email `e2e-<run>-<state>+clerk_test@example.com`. Doing this server-side avoids the CAPTCHA.
2. For any state except `new`, it calls the **internal** Convex function `e2e:seedPersona` through `npx convex run`.
3. `seedPersona` generalizes today's `debug:setupReassessmentTest` and sets up each state:
   - `needs-intake`: the user row only.
   - `onboarded`: intake, onboarding, and a program at GPP week 1 day 1, with training days that **include today's weekday** so Today always has a workout.
   - `phase-end`: last GPP workout done, reassessment pending.

**Cap:** each run creates about 5 Clerk users and deletes them all. The nightly sweeper keeps the instance well under its 100-user cap.

**Other accounts:** the shared `TEST_USER_*` account in `.env.local` stays only for a manual smoke check.

## 5. The first five flows

**Layout:**
- `.maestro/journeys/*.yaml` holds the steps.
- Thin per-platform entry files (`.maestro/web/*.yaml` with a `url:` header, `.maestro/native/*.yaml` with `appId: com.offseason.asrafit`) `runFlow` the journey.
- Shared subflows: `_sign-in.yaml`, `_evidence-start.yaml`, `_evidence-stop.yaml`.
- Credentials come in through `-e EMAIL=… -e PASSWORD=…`.
- Confirming how Maestro handles headers in shared subflows is a Phase 1 check.

**The flows:**

1. **`sign-in`**: `onboarded` persona.
   - Signs in through the UI and expects `today-workout-card` and "Start Workout".
   - Opens Profile, taps Sign Out, and expects "WELCOME BACK".
   - *This is the tracer bullet: built first, end to end, CI included.*
2. **`sign-up`**: no persona.
   - Fills Full name, `e2e-<run>-signup+clerk_test@example.com` and a password, then taps "Continue with Email".
   - Enters `424242` and expects the intake sport screen ("Search sports...").
   - Teardown: `persona delete`.
3. **`activation`**: `needs-intake` persona.
   - Steps: sign in → sport tile → Training Overview Continue → age group → experience → training days → season date → "I'll set these later" → results Continue → `longPressOn: commit-hold-button` → "You're Committed!" → Today shows `today-workout-card`.
   - Then `persona inspect` must report phase GPP, week 1, day 1.
4. **`workout-loop`**: `onboarded` persona.
   - Steps: Start Workout → Start → tap every `set-pill-pending` (a `repeat … while visible` loop) → Next/Finish → Done.
   - Today has advanced, and `persona inspect` shows a completed session and day 2.
   - It also checks the session appears in History, **after the History bug is fixed** (§10).
5. **`reassessment`**: `phase-end` persona.
   - Steps: Today banner "Start Now" → "Continue to Check-In" → difficulty "Just right" → Continue → maxes "Skip" → confirm.
   - `persona inspect` must show SPP unlocked and the reassessment cleared.

**Known hazards** (each handled in its flow, never by weakening an assertion):
- **Dates:** season-timeline choices are relative to today, and Today depends on the server's clock. Pick dates relative to now, and assert on structure, not on specific workout names.
- **Dialogs:** `alert()` turns into browser dialogs on web. Flows mustn't depend on dismissing them.
- **Auth flash:** Today may briefly show "COMPLETE YOUR SETUP" right after sign-in. Wait for `today-workout-card` rather than asserting immediately.

## 6. Evidence for each feature

**Every flow records its own evidence:**
- `_evidence-start` calls `startRecording`, and `_evidence-stop` calls `stopRecording`.
- Screenshots are numbered by step.
- Maestro writes them under `--test-output-dir`, collected into `e2e-artifacts/<flow>/<platform>/`:
  - `recording.mp4` (about 1 MB per 10 s)
  - `01-<step>.png`, `02-<step>.png`, …
  - Maestro logs

**Where evidence ends up. Nothing is committed to the repo**, following PStack's "keep the artifact visible; commit only when the trail must be auditable":
- **CI:** one GitHub Actions artifact per flow per platform (kept 90 days). The job summary has a pass/fail table that links each flow's artifact.
- **PR description:** uses Matt's `/pr` template. The **Evidence** section (Before/After) links the relevant flow artifacts. GitHub has no API for uploading attachments, so agents link to videos; drag a video in yourself when you want it inline.
- **Nightly gallery (phase 2):** a GitHub Pages site, deployed from an Actions artifact, showing each feature's latest web, Android and iOS screenshots and video side by side. It's the place to check things by eye.

## 7. CI wiring (GitHub Actions)

`.github/workflows/ci.yml`, triggered by `pull_request` and `push: main`:
- **`unit`:** `bun install --frozen-lockfile`, then `bun run test --ci`.
- **`typecheck`:** `scripts/typecheck-ratchet.ts` runs `tsc --noEmit`. It fails if the error count is above `.typecheck-baseline`, and tells you to lower the baseline when the count drops.
- **`e2e-web`** (needs `unit`, concurrency `e2e-backend`):
  1. Deploy `convex/` to `wander-fit-e2e` and seed it.
  2. `npx expo export --platform web` with `EXPO_PUBLIC_CONVEX_URL` pointing at the E2E project and the Dev-instance `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`.
  3. Serve the export, install pinned Maestro 2.11.0, and set `SE_BROWSER_VERSION=147`.
  4. For each flow: `persona create` → `maestro test --headless` → `persona delete`.
  5. Upload artifacts and write the summary.
  - It's skipped on fork PRs, which get no secrets.

`.github/workflows/e2e-native.yml`, triggered by `push: main` (Android only), nightly `schedule`, `workflow_dispatch`, and the PR label `run-native-e2e`:
- **`android`:** `expo prebuild -p android` → `./gradlew assembleRelease`, using the E2E environment values. Then run the emulator with `reactivecircus/android-emulator-runner`, and the flows the same way as the web job.
- **`ios`** (nightly and dispatch only): `expo prebuild -p ios` → `xcodebuild … -sdk iphonesimulator`. Boot the simulator and run the flows.
- **`report`:** for each failed flow, open *one* issue labelled `e2e-failure`, titled by flow and platform. If one is already open, comment on it instead, so nothing is filed twice.
- **`sweep`:** `persona sweep --older-than 2h`.
- **`gallery`** (phase 2): build and `actions/deploy-pages`.

**Secrets:**
- `CONVEX_DEPLOY_KEY_E2E`
- `CLERK_SECRET_KEY` (the Dev instance's `sk_test`)

**Variables:**
- `EXPO_PUBLIC_CONVEX_URL_E2E`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`

**Merge gates on `main`** (branch protection, so no more direct pushes):
- `unit` and `typecheck` are required once Phase 0b lands.
- `e2e-web` becomes required after **10 consecutive green runs on `main`**.
- Native jobs are advisory and report through `e2e-failure` issues.

## 8. When features need E2E

This rule goes into the Testing section of `CLAUDE.md` when Phase 1 lands:

- A **new user journey** ships with a new Maestro flow and a feature-map entry, in the same PR.
- A **change to an existing journey** updates or extends that journey's flow, in the same PR.
- **Pure logic** gets unit tests only.
- An **escaped bug** that E2E could have caught gets a regression flow.
- **Budget:** if the per-PR web suite goes over 10 minutes, the slowest flows move to nightly.

Each spec's *Testing Decisions* section (Matt's `/to-spec`) names the seam: unit, E2E, or both. Automated review checks the rule, and the nightly `/maintain-verification-skill` run flags user-facing surfaces missing from the feature map.

## 9. How it plugs into PStack and the software factory

**PStack** ([cursor/plugins/pstack](https://github.com/cursor/plugins/tree/main/pstack), poteto):
- After Phase 1 lands, install it (`/plugin marketplace add cursor/plugins`, then `/plugin install pstack@cursor-plugins`, after asking) and run `/pstack:create-verification-skill`.
- That generates `.claude/skills/verify-wander-fit/`:
  - **Launch:** web export plus serve, against `wander-fit-e2e`.
  - **Doctor:** URL up, right build, Convex reachable, Clerk key valid, seed status.
  - **Drive:** the Maestro web flows plus `persona`.
  - **Evidence:** §6's folders.
  - **Cleanup:** `persona delete` and stopping the server it started.
  - A `features/` map with one file per flow in §5.
- The generator must prove the skill once end to end before it's used.
- `/pstack:poteto-mode` playbooks (bug fix: repro first; feature: verify in the app) then use `/verify-wander-fit` to show video and screenshot proof.
- A nightly Claude Code scheduled task runs `/pstack:maintain-verification-skill`.

**Software factory** (Matt Pocock's [`/software-factory`](https://github.com/mattpocock/skills/pull/1316) vocabulary), the "All on GitHub" design:

| Slot | Product |
|---|---|
| Ticket tracker | GitHub Issues (the Linear "Preseason" team stays dormant) |
| Ticket sources | nightly `e2e-failure` reporter (later: an in-app feedback button) |
| Git host | GitHub |
| Orchestrator | GitHub Actions (plus Claude Code scheduled tasks for agent runs) |
| Runner | Actions runners; Claude Code cloud for agent runs |
| Observability platform | none, deliberately: Actions run pages and artifacts are enough |

**Tasks, added one at a time ("start slow"), with human review on every PR:**
1. **Automated checks:** the §7 jobs.
2. **E2E failure reporting:** the nightly `report` job, with no auto-fix.
3. **Automated review:** a Claude Code GitHub Action using the enabled `code-review` plugin, on PR open.
4. **Ratchet:** a daily run that fixes a few TypeScript errors, opens a PR, and lowers `.typecheck-baseline`.

The implementer task (ticket labelled ready → draft PR) waits until 1–3 have earned trust. Every loop of runs is capped at a few tries before it hands back to a human.

## 10. Work order

Each item is a PR. Items 0a–0c are prerequisites.

- **0a: Security lockdown (blocking).**
  - Make `seed.*`, `debug.*`, `generateTemplates.*`, `sampleData.*` and `migrations.fixLegacyAgeGroups` `internal*`.
  - `users.createUser` and `users.getCurrentUser` read `ctx.auth.getUserIdentity()` instead of taking `clerkId`, so update `app/(auth)/sign-up.tsx` and `hooks/useAuth.ts`.
  - Why: the repo and `eas.json` are public, so today anyone can call `clearAllData` or read any user's record.
- **0b: Tooling cleanup.**
  - Bun only: drop `packageManager: yarn@4.5.0`, and regenerate `bun.lock` so it carries Linux binaries (today it has only `@rollup/rollup-darwin-arm64`, so installs on Linux CI break Vitest).
  - Jest only: a two-project config. Delete the `vitest` import from 31 files, then remove `vitest` and `vitest.config.ts`.
  - Dependencies: add `jest` and `@types/jest` as dev dependencies. Move `jest-expo` and `@testing-library/react-native` to dev dependencies.
  - Scripts: `test` becomes `jest` (no more `--watchAll`), and add `test:watch`.
  - Fix the `calendarUtils` "program starting mid-week" test: the expected first workout is **Fri Feb 6**, as the code does.
  - Fix `RadioButton.test.tsx`: it calls `getByText` without destructuring it.
  - Delete `GoogleIcon.test.tsx`: it asserts SVG internals and uses APIs removed in React Native Testing Library v13.
  - Add the typecheck ratchet (baseline: 80 errors in non-test files today, before `@types/jest`).
  - Add `ci.yml` with `unit` and `typecheck`, and update `CLAUDE.md`'s test commands.
- **0c: Fix History.** Read `gpp_workout_sessions` (`api.gppWorkoutSessions.getHistory` already exists).
- **1: E2E framework.**
  - `convex/e2e.ts` (internal `seedPersona`, `deletePersonaData`, `inspectPersona`) and `scripts/e2e/persona.ts`.
  - The `.maestro/` layout and evidence subflows, plus `testID`s.
  - The **`sign-in` flow** as the tracer bullet, the `e2e-web` job, and the §8 rule in `CLAUDE.md`.
  - Phase 1 checks: Maestro web `id:` matching, subflow headers, `longPressOn` on web.
- **1b to 1e:** the `sign-up`, `activation`, `workout-loop` and `reassessment` flows, one PR each.
- **2: Native.** The `e2e-native.yml` jobs for Android and iOS, the `report` job, `sweep`, and the gallery.
- **3: PStack and the factory.** The verify skill and nightly maintenance; automated review; the TypeScript ratchet run.
- **Gate:** make `e2e-web` required after 10 green runs on `main`.

**Follow-ups found along the way** (separate tickets, outside this plan):
- Refactor `hooks/useAuth.ts` and `components/AuthGuard.tsx` onto `lib/authState.ts` and `lib/authGuard.ts`, so those tests cover real code.
- Clerk Production instance before launch: it needs a domain; then set the `production` profile to `pk_live_…` and the production Convex `CLERK_JWT_ISSUER_DOMAIN`.
- Dead code: `hooks/useOnboarding.ts` calls Convex functions that don't exist, and `(onboarding)/progression.tsx` pushes to a route that doesn't exist.
- Remove the legacy trainer/client screens, or decide to keep them.

## 11. Steps only you can do

- [ ] Create the free Convex project `wander-fit-e2e`. Set its `CLERK_JWT_ISSUER_DOMAIN` to `https://electric-leopard-75.clerk.accounts.dev`, and create a production deploy key.
- [ ] Clerk Dev instance: turn off bot sign-up protection, and copy the `sk_test_…` secret key.
- [ ] GitHub repo settings:
  - secrets `CONVEX_DEPLOY_KEY_E2E` and `CLERK_SECRET_KEY`
  - variables `EXPO_PUBLIC_CONVEX_URL_E2E` and `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - Pages source "GitHub Actions" (phase 2)
  - branch protection on `main` (after 0b)
- [ ] Convex dashboard: check `fleet-mallard-22`'s logs for unexpected calls to `clearAllData` and the `debug:*` functions.
