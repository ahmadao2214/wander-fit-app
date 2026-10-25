# Jest is the only unit-test runner

We run every unit and component test with Jest, as one `jest` command with two projects: a Node project for `convex/`, `lib/` and `hooks/`, and a `jest-expo` project for `components/` and `app/`. React Native component tests need `jest-expo`, and Vitest has no solid React Native support, so Jest is the one runner that covers everything. Moving the existing Vitest files was just deleting their `from 'vitest'` import line.

## Consequences

- Convex's function-testing library `convex-test` documents only Vitest. If we want to test real Convex functions (not just pure helpers) in-process, add Vitest back for `convex/` only, rather than dropping Jest.
