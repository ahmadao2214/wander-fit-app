---
name: verify-wander-fit
description: Drive the Wander Fit web export the way an athlete does and capture evidence. Use when proving a UI change, checking sign-in, or running the local verification tracer.
---

# Verify Wander Fit

This skill drives the static web export. It does not open a simulator. The same commands run on this machine and in GitHub Actions.

## Launch

From the repo root:

```bash
node scripts/verify/run.mjs all
```

`all` requires `EXPO_PUBLIC_CONVEX_URL_E2E` in the environment or in `.env.e2e`. It runs doctor, exports web, and serves it on `127.0.0.1:4173`. Then it runs every flow under `.maestro/web/`, one at a time. Each flow gets a fresh persona, which is deleted after the flow whether it passed or not. Sign-in gets an onboarded persona made through `persona create`. Sign-up gets only a new address and password, and makes the account through the UI; after Maestro passes, the runner fails the flow unless `persona inspect` finds a Convex user for it. It then stops the server and writes `e2e-artifacts/web-results.json`. A missing URL is a failed check, not a signed-out pass. Name flows to run only those: `node scripts/verify/run.mjs all sign-in`.

`all` does not deploy. To push this checkout's `convex/` functions to wander-fit-e2e and seed it first:

```bash
node scripts/verify/run.mjs deploy
```

`deploy` runs `npx convex dev --once` against wander-fit-e2e only, through `CONVEX_DEPLOY_KEY_E2E` or `.env.e2e`. It never passes `--env-file`, and it restores `.env`, `.env.local` and `.gitignore` if the Convex CLI rewrites them. Then it runs `seed:seedAll`, which skips rows that already exist.

The signed-out screen is a separate command. It does not create a persona or submit:

```bash
node scripts/verify/run.mjs screen
```

With no e2e URL, `screen` bakes `https://wander-fit-e2e.invalid`. Ready on that path means Maestro can see `WELCOME BACK`.

The export sets `EXPO_NO_DOTENV=1`. It refuses to serve a bundle that contains `fleet-mallard-22.convex.cloud`, `accomplished-tapir-54.convex.cloud`, or a real Clerk secret (`sk_test_` or `sk_live_` followed by a token).

## Doctor

```bash
node scripts/verify/run.mjs doctor
```

Doctor checks the Clerk publishable key, Java, Maestro, and the Convex host. It prints whether the key is present. It does not print the key.

## Drive

Web flows: `.maestro/web/<flow>.yaml`, one entry file per journey. The entry sets `url:` and `runFlow`s `.maestro/journeys/<flow>.yaml`. Sign-in, evidence start, and evidence stop are shared subflows. See `.maestro/flow-layout.md`. Signed-out screen: `.maestro/sign-in-screen.yaml`.

```bash
node scripts/verify/run.mjs launch
node scripts/verify/run.mjs drive
```

`launch` and `drive` are manual pieces. `drive <url> <flow>` runs one web flow with the persona already in `e2e-artifacts/persona-latest.json`, and fails when an e2e URL is set and that file is missing. It does not create or delete the persona. `all` does both.

With no e2e URL, `screen` and `drive` use `.maestro/sign-in-screen.yaml`. That flow opens the signed-out screen, checks the welcome copy and the fields, taps the email field, and does not submit. `.maestro/web/sign-in.yaml` types the fresh persona, submits Sign In, waits for the Today workout card, opens Profile, and taps Sign Out. The password stays in `e2e-artifacts/persona-latest.json` until the persona is deleted, and is not printed.

## Evidence

`e2e-artifacts/<flow>/web/` holds Maestro's screenshots, `commands.json`, `logs/maestro.log`, and the runner's `result.json`. The signed-out screen writes to `e2e-artifacts/sign-in-screen/web/`. The directory is gitignored. Cleanup must leave it in place.

Maestro's log records the typed text, including the persona password. The runner replaces the password with `[redacted]` in every text file before it deletes the persona. Each flow records `startRecording/recording.mp4` in its evidence folder.

## Cleanup

```bash
node scripts/verify/run.mjs cleanup
```

Cleanup kills the server pid recorded in `/tmp/wander-fit-verify.json`. It does not delete `e2e-artifacts/`.

```bash
node scripts/verify/run.mjs teardown
```

Teardown is for an interrupted run. It stops the server, redacts the password of the persona still in `e2e-artifacts/persona-latest.json` from the evidence, and deletes that persona.

## CI

The `Web E2E (advisory)` job in `.github/workflows/checks.yml` runs on every same-repo PR, on pushes to `main`, and on manual dispatch. It runs after the Vitest job: deploy, `all`, teardown, one artifact per flow (`e2e-web-<flow>`), then `scripts/verify/summary.mjs` writes the pass/fail table to the job summary. Every E2E job shares the `e2e-backend` concurrency group. Fork PRs skip it. It is not a required check.

A new flow under `.maestro/web/` needs its own upload step in that job. `scripts/verify/flows.test.mjs` fails until it has one.

## Users

```bash
node scripts/verify/persona.mjs help
```

`create`, `inspect`, `delete`, and `sweep` talk only to `wander-fit-e2e` (`.env.e2e` or `CONVEX_DEPLOY_KEY_E2E`) and the Clerk Backend API. They refuse the two app deployments named above. `create` writes the password to `e2e-artifacts/persona-latest.json` and prints the email. `delete` and `sweep` only remove `e2e.<timestamp>+clerk_test@example.com` and `e2e-<timestamp>-signup+clerk_test@example.com` addresses. Deleting an address that was never created does nothing.

## Feature map

Read `features/README.md`, then the feature file for the journey you are proving. A screen that never leaves `Loading...` is a failed doctor, not a product bug to paper over.
