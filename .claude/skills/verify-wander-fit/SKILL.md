---
name: verify-wander-fit
description: Launch the Wander Fit web export against the E2E backend, health-check it, drive its Maestro journeys with fresh test personas, and keep screenshots and video as evidence. Use whenever a UI change needs proving in the real app ("verify it in the app"), when checking sign-in, the First Run, History, reassessment or the workout loop, or before asking for review.
---

<!-- Generated with pstack's create-verification-skill (.claude/skills/create-verification-skill). Maintained by maintain-verification-skill. -->

# Verify Wander Fit

This skill drives the static web export in headless Chromium with Maestro. It does not open a simulator, and the same commands run on this machine and in GitHub Actions. Every helper is `scripts/verify/run.mjs` (launcher, doctor, driver, cleanup) or `scripts/verify/persona.mjs` (test athletes). Run them from the repo root with `node`.

Before you start on a shared machine, give this run its own port and state files, so you never stop or drive another agent's server:

```bash
export VERIFY_PORT=4273
export VERIFY_STATE_FILE="$TMPDIR/wander-fit-verify.json"
export VERIFY_READY_FILE="$TMPDIR/wander-fit-verify.ready"
export VERIFY_LOG_FILE="$TMPDIR/wander-fit-verify.log"
```

Ports and state files keep servers apart, not checkouts: two runs in one checkout still share `dist-verify/` and `e2e-artifacts/persona-latest.json`, so one can replace the other's bundle or persona. Run at most one verify run per checkout at a time, and give parallel runs their own worktrees.

The defaults are port 4173 and `/tmp/wander-fit-verify.*`. The env files `.env`, `.env.local` and `.env.e2e` are gitignored; in a fresh worktree, symlink them from the main checkout.

## Launch

The one-command path is:

```bash
node scripts/verify/run.mjs all sign-in
```

`all [flow...]` runs doctor, exports web (`npx expo export --platform web` into `dist-verify/`, with `EXPO_NO_DOTENV=1`), serves it on `127.0.0.1:$VERIFY_PORT`, runs each named flow under `.maestro/web/` (all of them when none is named) one at a time with a fresh persona each, stops the server, and writes `e2e-artifacts/web-results.json`. It exits non-zero if any flow failed. It needs `EXPO_PUBLIC_CONVEX_URL_E2E` (environment or `.env.e2e`); a missing URL is a failed check, not a signed-out pass.

The manual pieces, for driving by hand:

```bash
node scripts/verify/run.mjs launch        # export if stale, serve, print "serving http://127.0.0.1:<port>/"
node scripts/verify/run.mjs doctor        # now also checks the live server
node scripts/verify/persona.mjs create --state onboarded
node scripts/verify/run.mjs drive "http://127.0.0.1:$VERIFY_PORT/" sign-in
```

Ready means `launch` printed `serving …`: the child wrote its own pid to the ready file after binding, and the root URL answered. Launch re-exports when `dist-verify/verify-build.json` was built from a different source stamp (HEAD plus any uncommitted or untracked change) or a different backend, so an uncommitted edit is always in the served bundle.

`all` and `launch` do not deploy. The E2E backend (`wander-fit-e2e`) is deployed and seeded by CI and the founder with `node scripts/verify/run.mjs deploy`. Don't run `deploy` while verifying; if doctor reports the deployment unseeded or a flow fails on a missing field, report it as a backend precondition.

The export refuses to serve a bundle that contains `fleet-mallard-22.convex.cloud`, `accomplished-tapir-54.convex.cloud` (the app deployments), or a real Clerk secret.

## Doctor

```bash
node scripts/verify/run.mjs doctor
```

Read-only, and it never prints a key or password. It answers "is this instance worth driving?":

- `clerk publishable key` present, decodes to a Frontend API host, and `clerk frontend api: reachable` (Clerk accepted it).
- `maestro` and Java installed.
- `convex host` is the e2e deployment (app deployments are refused), `backend: reachable` (`/version`), and `seed: <n> program templates, <n> sports` with both above zero (public `programTemplates:getCount` and `sports:list`).
- `server`: when this run's state file records one, the pid is alive and owns the port, the page answers, and `build:` (from the served `verify-build.json`) matches this checkout's HEAD, source stamp and Convex host. Otherwise `server: not running (launch starts it)`.

It ends `doctor: ok` or lists each problem and exits 1. Run it first, after any failed drive, and whenever something looks off. A screen stuck on `Loading...` is a failed doctor, not a product bug.

## Drive

Web flows are `.maestro/web/<flow>.yaml`, one entry per journey: `first-run`, `history`, `reassessment`, `sign-in`, `workout-exit-resume`. Each entry sets `url: ${VERIFY_URL}`, launches with a cleared state, and runs `.maestro/journeys/<flow>.yaml`. Sign-in and evidence start/stop are shared subflows in `.maestro/subflows/`. Layout and Maestro web findings: `.maestro/flow-layout.md`.

- `node scripts/verify/run.mjs all <flow>` is the normal drive. The runner picks the persona: `first-run` gets only a new `e2e-<run>-signup+clerk_test@example.com` address and password (the UI makes the account, and `persona inspect` must then show the saved GPP W1 D1 program); `history` gets `--state with-history`; `reassessment` gets `--state phase-end`; every other flow gets `--state onboarded`.
- `node scripts/verify/run.mjs drive <url> <flow>` runs one flow with the persona already in `e2e-artifacts/persona-latest.json`. It neither creates nor deletes the persona.
- `node scripts/verify/run.mjs screen` checks only the signed-out screen (`.maestro/sign-in-screen.yaml`); it needs no e2e URL and never submits.

Test athletes:

```bash
node scripts/verify/persona.mjs help
node scripts/verify/persona.mjs create --state <new|onboarded|with-history|phase-end> --json
node scripts/verify/persona.mjs inspect <email> --json
node scripts/verify/persona.mjs delete <email>
node scripts/verify/persona.mjs sweep --older-than 2h
```

They talk only to `wander-fit-e2e` and the Clerk Backend API. `create` writes the password to `e2e-artifacts/persona-latest.json` (mode 600) and prints only the email. `delete` and `sweep` remove only generated `e2e.<timestamp>+clerk_test@example.com` and `e2e-<timestamp>-signup+clerk_test@example.com` addresses. `inspect` reports the account and program position (intake, first launch, onboarding, phase, week, day) and each session: status, exercise IDs, the template's main-exercise count, and how many of those are not fully logged.

Pick the feature file for the journey you are proving from `features/README.md`, and follow it literally.

## Evidence

Each flow writes `e2e-artifacts/<flow>/web/`. Maestro puts each run in a timestamped folder inside it: `<timestamp>/<flow>/takeScreenshot/<NN-name>.png` (numbered screenshots, e.g. `03-today.png`), `<timestamp>/<flow>/startRecording/recording.mp4`, `commands.json`, `manifest.json` and `logs/maestro.log`. `all` also writes the runner's `result.json` (`status`, `seconds`, `error`) at `e2e-artifacts/<flow>/web/result.json`, and `.scrubbed` marks a folder whose password was redacted. Find the latest run with `ls -t e2e-artifacts/<flow>/web | head`. `e2e-artifacts/web-results.json` lists every flow of the run. The signed-out screen writes `e2e-artifacts/sign-in-screen/web/`. The folder is gitignored and survives cleanup.

Proof standards: drive the real athlete path, never internal setters or test-only screens; capture the action and the screen it leads to; prove side effects (the First Run's `persona inspect`, or stored state read back after a reload) as well as what is visible; never weaken an assertion to pass. Maestro's log records typed text, so the runner replaces the persona password with `[redacted]` in every text file before it deletes the persona. Don't paste a password into a PR; link the folder or attach screenshots.

## Cleanup

```bash
node scripts/verify/run.mjs cleanup
```

Kills only the server pid recorded in `$VERIFY_STATE_FILE`, removes that file and the ready file, and leaves `e2e-artifacts/` in place. `all` does this itself, and deletes each persona after its flow.

```bash
node scripts/verify/run.mjs teardown
```

For an interrupted run, or after `persona create` by hand: stops the server, redacts the password of every persona left in `e2e-artifacts/persona-latest.json` or `persona-pending.json` from the evidence, and deletes those accounts. Run it after every failed iteration. Never kill by process name. Afterwards, check the evidence folder still exists.

## CI

The `Web E2E (advisory)` job in `.github/workflows/checks.yml` runs on every same-repo PR, on pushes to `main` and on manual dispatch: deploy (PRs get their own `pr-<number>` preview deployment), `all`, teardown, one artifact per flow (`e2e-web-<flow>`), and `scripts/verify/summary.mjs` for the job summary. A new flow under `.maestro/web/` needs its own upload step there (`scripts/verify/flows.test.mjs` fails until it has one) and a feature file here (`scripts/verify/feature-map.test.mjs`).

## Feature map

`features/README.md` is the index; one file per web flow plus the native-only features, in pstack's four-section format. Keep it current with `/maintain-verification-skill`; a nightly run does this (see `.claude/docs/pstack/README.md`).
