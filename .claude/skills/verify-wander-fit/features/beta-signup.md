# Beta signup

A visitor enters an email and pricing preference on the landing page and reaches the Beta Access Panel.

## Sub-features

- Signup opens the Beta Access Panel after the visitor submits the form.

## How to get to it (user POV)

- Open the landing page and select “Start 2-week free beta.”

## Driving it with Maestro

Preconditions: Serve the static landing directory locally on port 4174.

- Run `maestro test -e LANDING_URL=http://localhost:4174 .maestro/landing/beta-signup.yaml`. The flow selects “Start 2-week free beta,” enters an email, chooses “Just trying the free beta first” and submits. The panel displays “You’re in. Pick how you’ll train.”

## Gotchas

- The flow uses local preview mode. Convex signup persistence and rate limits are covered by `convex/__tests__/waitlist.test.ts`.
