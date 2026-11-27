# Team: wander-fit

The team charter (seats, routing, brief, approvals) is global, in `~/.config/agents/TEAM.md`, and every agent already has it. This file adds what's specific to this repo. AGENTS.md wins on how the code is written.

wander-fit is the test bed for the team setup: when the setup itself needs a change, try it here first, then move it into the global charter.

## Done when

`bun run test:ci && bun run typecheck`, run in the thread's own worktree. UI changes also show the journey working in the simulator.

## Approvals specific to this repo

- Any EAS build, `eas workflow:run`, `testflight-*` tag, or EAS cloud simulator run. iOS builds are capped at 15 a month; see `docs/BUILDS.md`.
- Convex prod deploys.

## Repo rules the team must not break

- One iOS simulator (iPhone 17). One thread holds it at a time; ask the holder, take turns, never take over.
- Never push branch functions to the shared `wander-fit-e2e` Convex deployment. Use PR previews.
- Worktrees share the Convex dev deployment and Metro's port: one thread runs `convex dev` and Metro at a time.
- New journeys ship with a Maestro flow and a feature-map entry. Changed journeys update their flow.
- UI PRs get an emil-ui-review pass on the rendered screens before handoff.
- Bun only. Never regenerate `bun.lock`; patch entries in place.

## Machines

| Machine | Good at | Never run here |
|---------|---------|----------------|
| MacBook Air (3), the primary machine; it owns memory | Everything; the only iOS simulator | More than 2 Builders at once (it's a laptop: watch RAM and MCP processes) |
