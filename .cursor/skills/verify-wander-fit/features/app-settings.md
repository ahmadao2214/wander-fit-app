# App Settings

An athlete opens App Settings from Profile and finds how to connect a chat assistant (Claude) to their program.

## Sub-features

- `app-settings-open`: an onboarded persona signs in, opens Profile, taps App settings (`profile-app-settings`), and lands on "App Settings".
- `app-settings-connector`: the screen shows "Connector address" with this build's MCP address (`mcp-address`, the deployment's `.convex.site/mcp`) and the steps to add a custom connector in Claude, ending with a change to a day waiting for the athlete to accept it.
- `app-settings-back`: Back (`Back`) returns to Profile.

## Run

- `node scripts/verify/run.mjs all app-settings` creates an onboarded persona, runs `.maestro/web/app-settings.yaml`, and deletes the persona.
- The web entry launches and runs `.maestro/journeys/app-settings.yaml`, which signs in through `.maestro/subflows/_sign-in.yaml`.

## Why

New journey in PR #128 (the Wander Fit chat connector). The connector itself is covered by Convex tests and live checks; this flow covers the in-app place that tells the athlete how to add it.
