# Agent Guidelines

Project conventions are in `CLAUDE.md`. This file adds rules for coding agents.

## Testing

### Simulator self-check

- Before you ask for review, show the changed journey working in a simulator.
- Iterate on the local simulator.
- Do at most one EAS cloud simulator run per pull request, for the recording. Cap it with `--max-duration-minutes 5` or less, and link the recording in the pull request description. Cloud minutes are scarce: the plan includes 60 a month for everything.
- Never leave a cloud session running. Run `eas simulator:stop` when you finish, even after a failure.
- A new journey may also get a Maestro flow. The criteria for when come later.
- How to run both loops: `scripts/sim/README.md`. The cloud run is `npm run sim:cloud-check`.
