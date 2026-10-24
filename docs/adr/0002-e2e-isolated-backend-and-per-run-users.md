# E2E runs on its own Convex project, the Clerk Development instance, and throwaway users

E2E never touches the Convex deployment the app builds use (`fleet-mallard-22`). It runs against a separate free Convex project, which CI deploys the PR's functions to and seeds before each run, with runs serialized. Auth uses the existing Clerk Development instance, which is for development and testing only. Production moves to a Clerk Production instance before launch. Each flow gets a fresh Clerk user, created through the Backend API, put into a named state by an internal Convex function, and deleted afterwards. A sweeper removes leftovers, which keeps the Development instance under its 100-user cap.

## Consequences

- Bot sign-up protection is deliberately **off** on the Clerk Development instance, because Maestro cannot pass Clerk testing tokens. Don't turn it back on without replacing the sign-up flow's approach. Keep it on in Production.
- Test-setup functions are `internal*` Convex functions, reachable only with a deploy key, never public.
