# Design

Follow this file. Do not ask. Colour comes from `sportTheme(sport, scheme)` in `lib/sportTokens.ts`. Sports are `basketball`, `soccer`, and `track`. Schemes are `chalkboard` and `whiteboard`. A sport, scheme, role, or colour that function does not return does not exist.

Paint with the role tokens. A raw hex is a bug. Electric Blue `#2563EB` is not a role. A phase has no fill. Build, Train, and Sharpen are words. GPP, SPP, and SSP are those same words.

## Roles

`sportTheme` in `lib/sportTokens.ts` returns these roles and no others.

- `marker` — the sport pen, from `lib/sportTokens.ts`. The route, the chosen item, the hero number, and the athlete dot.
- `boardSurface` — the board surface, from `lib/sportTokens.ts`. The ground of a board screen. It may carry the sport hue.
- `ink` — neutral dark, from `lib/sportTokens.ts`. Words on a whiteboard. The button label on a chalkboard.
- `chalk` — neutral light, from `lib/sportTokens.ts`. Words on a chalkboard. The button label on a whiteboard.
- `button` — the neutral button, from `lib/sportTokens.ts`. The face is `chalk` on a chalkboard and `ink` on a whiteboard.
- `instrumentBackground` — neutral ground, from `lib/sportTokens.ts`. The ground of an instrument screen.

## Which screen

Does the athlete look at the play?

- Yes: a board screen.
- No: an instrument screen.

A board screen is Program, and the trip on First Run. Paint the background with `boardSurface`. Draw the play with `renderOriginalPlay` from `lib/originalPlay.ts`. The stroke is `marker` at width 2.8. Words are `chalk` on a chalkboard and `ink` on a whiteboard. One neutral button uses `button`.

Program shows that play already drawn. The trip plays on First Run and again only when the season changes. Use the route in `lib/originalPlay.ts`. Draw no second route.

An instrument screen is Execute, Set Edit, or a press. Paint the background with `instrumentBackground`. Words are `chalk` on a chalkboard and `ink` on a whiteboard. Show the lift, the set, the reps, and the load. One neutral button uses `button`. The screen has no `svg`, no route, and no court.

## Button

The neutral button is the one action on the screen. A second action is text, or it waits. No other button variant exists.

The face is `theme.button` from `lib/sportTokens.ts`. The label is `theme.ink` on a chalkboard and `theme.chalk` on a whiteboard. Height is 48. Radius is 14.

```tsx
const theme = sportTheme('basketball', 'chalkboard')

<button type="button" style={{ background: theme.button.hex, color: theme.ink.hex }}>Log Set</button>
```

```tsx
const theme = sportTheme('basketball', 'chalkboard')

<button style={{ background: theme.marker.hex }}>Log Set</button>
<button style={{ background: '#2563EB' }}>Log Set</button>
```

The second block is wrong. `marker` is the pen. `#2563EB` is Electric Blue. A phase name is never a fill.

## Motion

Durations live on `MOTION` in `lib/motion.ts`.

- Draw-on is 480 ms, ease `cubic-bezier(0.45, 0, 0.25, 1)`, for one leg. The next leg starts after 442 ms. Three legs take 1364 ms.
- A control already on screen is 180 ms, ease `cubic-bezier(0.65, 0, 0.35, 1)`. Repeated feedback stays under 300 ms.
- Reduced motion is 0 ms. The board is already drawn, fades included. `button.press` animation is `none`.
- Bounce is 0.

## Instrument screen

Execute is the instrument. Copy these roles. Add no court.

```tsx
const theme = sportTheme('basketball', 'chalkboard')

<main style={{ background: theme.instrumentBackground.hex, color: theme.chalk.hex }}>
  <h2>Execute</h2>
  <p>Back squat</p>
  <p>Set 2 of 4</p>
  <p>6 reps</p>
  <p>135 lb</p>
  <button type="button" style={{ background: theme.button.hex, color: theme.ink.hex }}>Log Set</button>
</main>
```

## Slots

A drawing uses `SLOT_TABLE` in `lib/drawingSlots.ts`. Shared slots are surface, marker, finish, and the athlete dot. The dot is filled with `marker` and has no number. Basketball and soccer finish by scoring and may show a ball. Track finishes on the line and has no ball.
