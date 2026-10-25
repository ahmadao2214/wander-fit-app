# Jest is the only unit-test runner

We run every unit and component test with Jest, as one `jest` command with two projects: a Node project for `convex/`, `lib/` and `hooks/`, and a `jest-expo` project for `components/` and `app/`. React Native component tests need `jest-expo`, and Vitest has no solid React Native support, so Jest is the one runner that covers everything. Moving the existing Vitest files means deleting their `from 'vitest'` import line, since none of them use `vi.*`.

## Consequences

- Convex's function-testing library `convex-test` documents only Vitest. If we want to test real Convex functions (not just pure helpers) in-process, add Vitest back for `convex/` only, rather than dropping Jest.
- This replaces the two-runner split that PR #61 documented in `CLAUDE.md` (now `AGENTS.md`) as a way to get both suites green. Phase 0b of `docs/e2e-testing-plan.md` makes the switch with a rerunnable codemod.
