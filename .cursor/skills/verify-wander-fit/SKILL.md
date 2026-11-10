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

`all` runs doctor, exports web, serves it on `127.0.0.1:4173`, runs Maestro, then stops the server. Evidence stays in `e2e-artifacts/sign-in/web/`.

The export sets `EXPO_NO_DOTENV=1`. It bakes `EXPO_PUBLIC_CONVEX_URL_E2E` from the environment or from `.env.e2e`. Otherwise it bakes `https://wander-fit-e2e.invalid` and the flow only looks at the signed-out screen. It refuses to serve a bundle that contains `fleet-mallard-22.convex.cloud`, `accomplished-tapir-54.convex.cloud`, or a real Clerk secret (`sk_test_` or `sk_live_` followed by a token).

When an e2e URL is configured, `all` creates a fresh onboarded persona, submits Sign In, and waits until `Welcome back,` is visible. Ready on the screen-only path means Maestro can see `WELCOME BACK`.

## Doctor

```bash
node scripts/verify/run.mjs doctor
```

Doctor checks the Clerk publishable key, Java, Maestro, and the Convex host. It prints whether the key is present. It does not print the key.

## Drive

Maestro flow: `.maestro/sign-in.yaml`.

```bash
node scripts/verify/run.mjs launch
node scripts/verify/run.mjs drive
```

With no e2e URL, `.maestro/sign-in.yaml` opens the signed-out screen, checks the welcome copy and the fields, taps the email field, and does not submit. With `EXPO_PUBLIC_CONVEX_URL_E2E` set, `.maestro/sign-in-submit.yaml` types the fresh persona and submits Sign In. The password stays in `e2e-artifacts/persona-latest.json` and is not printed.

## Evidence

`e2e-artifacts/sign-in/web/` holds Maestro's screenshots and command logs. That directory is gitignored. Cleanup must leave it in place.

## Cleanup

```bash
node scripts/verify/run.mjs cleanup
```

Cleanup kills the server pid recorded in `/tmp/wander-fit-verify.json`. It does not delete `e2e-artifacts/`.

## Users

```bash
node scripts/verify/persona.mjs help
```

`create`, `inspect`, `delete`, and `sweep` talk only to `wander-fit-e2e` (`.env.e2e` or `CONVEX_DEPLOY_KEY_E2E`) and the Clerk Backend API. They refuse the two app deployments named above. `create` writes the password to `e2e-artifacts/persona-latest.json` and prints the email. `delete` and `sweep` only remove `e2e.<timestamp>+clerk_test@example.com` addresses.

## Feature map

Read `features/README.md`, then the feature file for the journey you are proving. A screen that never leaves `Loading...` is a failed doctor, not a product bug to paper over.
