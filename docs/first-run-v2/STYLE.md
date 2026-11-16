# First Run v2: style guide

The First Run is the athlete's first five minutes with Wander Fit. It should feel like a game-day broadcast built around their sport, not like a form.

## The look

- **Game night.** The intake is always dark, whatever the phone's theme: deep navy, with the athlete's sport and category supplying the color. The rest of the app keeps its light and dark themes.
- **Type is the hero.** Questions are set huge in Bebas Neue, the app's display face, like a broadcast title card. Everything else is Plus Jakarta Sans.
- **One focal point per screen.** Each screen has one thing that moves or one thing to answer. Nothing competes with it.
- **Your sport becomes the world.** Once a sport is picked, its icon stays in the background of every later screen. It's large and cropped, and it drifts slowly, the way a team logo sits behind a broadcast graphic.

## References: one job each

| Reference | Its one job | What we take from it |
| --- | --- | --- |
| NBA and ESPN broadcast graphics | **Type** | Condensed headlines that fill the width, small tracked-out labels, numbers set as the hero ("12 WEEKS"). Graphics wipe in from one edge instead of fading. |
| Spotify Wrapped, Instagram Stories | **Transitions** | One idea per page, and each page turns to the next. Advancing feels physical: the old page leaves the way the next one arrives. |
| Strava "Year in Sport" | **Pacing** | Calm and quick through the questions, saving the time for one big moment at the end. The reveal is the only place we spend more than half a second. |

We take the principles, not the look. Nothing here should resemble those brands' actual graphics.

## Motion rules

- **Page turn between questions:** 420 ms. The current page slides left 30% and darkens. The next page comes in from the right edge over it. Easing `cubic-bezier(0.32, 0.72, 0, 1)`. Back reverses it.
- **Answering:** under 200 ms. A press scales to 0.96, the selection fills from the touch point, and iOS gives a light haptic.
- **Sport tap:** the sport's own animation plays once at its tile. The animations run 5 s; the prototype plays them at 1.6×, about 3 s, and the build should settle on a length. Nothing else moves at the same time.
- **Headline entrance:** each question's title wipes up from a clip mask, 320 ms, 60 ms behind the page turn. Only the title animates. The choices are already in place.
- **The reveal is the one long moment,** about 3.7 s in all. It's choreographed in beats, each beat ends where the next one starts, and nothing in it overlaps.
- **Everything animates transform and opacity only.** No layout animation. The one exception is the continuous reveal, where the category tile opens into the band with a clip, so its text never stretches.
- **Reduced motion:** no page turns (an instant swap), no drift, the sport icon shown still, and the reveal as a single still frame. **Web:** a crossfade instead of the page turn, with the reveal kept.

## Avoid list

From the saved checklists (Ayush Soni, David K, Motion Engineering):

- glowing cards, neon, gradient orbs, a gradient in every scene
- bouncing headlines, spinning interfaces, particle bursts, confetti
- outlined containers around everything, multiple shades and opacities of the same color
- italic accent words, serif display fonts, section numbering as decoration
- motion that explains nothing, several effects at once, generic easing, one-shot animations that rush

From the first First Run build:

- a "Your program" box at the top of every question
- top-aligned screens with an empty bottom half
- jumping straight into the warm-up after sign-up
- ending on a screen of small text ("Basketball trains for Power.") instead of a moment

## Build notes

- Use the app's spacing and radius tokens on the 4pt grid from PR #119 (`lib/spaceScale.ts`): $1=4, $2=8, $3=12, $4=16, $5=24, $6=32. Radii: $3=8, $4=12, $5 and $6=16. The prototype's pixel values are approximate; round them to these.
- Use the type roles from `components/Typography.tsx` (#117) where they fit: Display, Title, SectionTitle, Body, Supporting, Caption. 12pt minimum. The huge question headlines are bigger than Display, so they get one intake-only style on top of Display.
- Dark `$brand1` is `#172554` after #119, no longer the same color as the page background.
