# Wander Fit verification map

This directory is the maintained source for verifying Wander Fit on the web export. Read this index, then use the feature file as the recipe.

## Baseline preconditions

- Run `node scripts/verify/run.mjs doctor` and require it to pass.
- Launch with `node scripts/verify/run.mjs launch`. The server binds `127.0.0.1` only.
- Drive with Maestro through `node scripts/verify/run.mjs drive`.
- The export must not contain an app Convex deployment or a Clerk secret. The runner scans for those and stops.
- `node scripts/verify/run.mjs all` submits sign-in and fails when `.env.e2e` or `EXPO_PUBLIC_CONVEX_URL_E2E` is missing. The signed-out screen is `node scripts/verify/run.mjs screen`.
- Never drive a dev server that was already running for manual work. This runner serves `dist-verify/` only.

## Driving conventions

- Start from the signed-out screen unless a feature file says otherwise.
- Prefer visible text (`WELCOME BACK`, `Sign In`) over coordinates.
- Treat the commands in each feature file as literal.
- Leave proof files in `e2e-artifacts/`. Cleanup removes the server, not the proof.

## Proof and skip reporting

- Capture the action and the screen that follows it.
- Record the feature id with the screenshots.
- If a path is unreachable, report the command and the missing precondition. Do not call a different path verified.

## Features

- [Sign in](./sign-in.md) covers the signed-out welcome screen. It does not complete a session.
