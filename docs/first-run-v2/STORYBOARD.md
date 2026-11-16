# First Run v2: storyboard

**Decided (2026-11-15):** category timing is B (hint, then payoff); the ending is continuous; Season is the calendar; About you is the player card. Where a screen below lists variations, those are the chosen ones.

Each screen lists how it enters, what the athlete does, and how it hands off to the next. A screen's last frame is the next screen's first. Times are from the moment the screen starts entering.

The four categories, named the way athletes will see them (from `gpp_categories`):

| Category | Shown as | Color | Sports | One line |
| --- | --- | --- | --- | --- |
| 1 Continuous/Directional | **Endurance** | teal `#14B8A6` | Cross Country, Field Hockey, Lacrosse, Rugby, Soccer, Track (Distance), Ultimate Frisbee | Long runs with changes of direction. Built on endurance and single-leg stability. |
| 2 Explosive/Vertical | **Power** | purple `#A855F7` | Basketball, Cheerleading, Diving, Gymnastics, Track (Sprints/Jumps), Volleyball | Jumping, landing, and stopping fast. Built on vertical power and safe landings. |
| 3 Rotational/Unilateral | **Rotation** | orange `#F97316` | Badminton, Baseball, Cricket, Golf, Racquetball, Softball, Tennis | Swinging, throwing, and twisting with force. Built on hip power and core control. |
| 4 General Strength | **Strength** | blue `#3B82F6` | Football, General Fitness, Ice Hockey, Martial Arts, Swimming, Weightlifting, Wrestling | Contact, grappling, and moving heavy things. Built on total-body strength and grip. |

## 0. Promise

- **Enters:** at app launch it's already there, with no entrance. Five sport icons, one from each category plus General Fitness, drift slowly behind the headline as large, very faint shapes, each crossing in 18–30 s.
- **Shows:** "LET'S BUILD YOUR PLAN FOR THIS SEASON." set huge, left-aligned, filling the width. One button: **Choose your sport**. Under it, the link "I have an account".
- **Exits:** the button press turns the page. The drifting icons keep moving behind the page turn, so the world feels continuous.

## 1. Sport

- **Enters:** page turn. "PICK YOUR SPORT" wipes up.
- **Shows:** a **Popular** row of six large tiles: Basketball, Soccer, Football, Baseball, Volleyball, Track (Sprints/Jumps). Below it, **All sports**: the other 21 sports alphabetically in a 3-column grid, with search.
- **Tap:** the tile fills, its icon plays its animation once, and a haptic fires. Tapping another sport moves the selection, and the new icon plays.
- **Category timing (decide from the prototype):**
  - **A, end only:** nothing about the category here.
  - **B, hint, then payoff:** the background takes a faint wash of the category color as the icon plays. No words.
  - **C, at the pick:** a broadcast-style label wipes into a fixed line under the Popular row: "BASKETBALL · POWER".
- **Exits:** Continue turns the page. The picked icon leaves its tile, grows, and settles large and cropped in the background corner. From here on it's the backdrop.

## 2. Season

- **Enters:** page turn. "WHEN'S YOUR FIRST GAME?" wipes up. The sport backdrop sits behind it.
- **Variations (decide from the prototype):**
  - **Calendar:** the old month calendar. Tap a date, and a big number shows the weeks away.
  - **Bold slider:** a huge number ("12") with "WEEKS TO GAME DAY" and the date under it. A wide slider below.
  - **Season runway:** a horizontal track from TODAY to a game-day flag. Dragging the flag splits the track live into GPP, SPP and SSP blocks, each labeled with its weeks. It uses the real phase math: 2–8 weeks per phase, 6–24 weeks in all. The athlete sees the plan taking shape as they answer.
- **No set season:** a choice under every variation. It sets a 12-week plan.
- **Exits:** Continue turns the page.

## 3. Training days

- **Enters:** page turn. "WHICH DAYS CAN YOU TRAIN?" wipes up. The preselected Mon/Wed/Fri fill one after another as the page arrives.
- **Shows:** centered in the screen, seven tall day tiles, Mon to Sun. Under them, a live line: "3 SESSIONS A WEEK · MON / WED / FRI".
- **Tap, themed by the sport's movement family.** One choreography per family, generated in code; each sport supplies only its ball or object and colors:

| Family | Sports | A day turning on |
| --- | --- | --- |
| Roll | Soccer, Field Hockey, Lacrosse, Rugby | Fills pitch green at an even pace while the ball rolls up on the surface, then rolls out the top (950 ms) |
| Bounce | Basketball, Volleyball | Exactly three dribbles; each contact lands on the surface and raises the fill a third (1150 ms) |
| Water | Swimming, Diving | Fills pool blue like a lane, with a ripple that settles (900 ms) |
| Arc, Swing, Body | Football, Baseball, Softball, Cricket, Ultimate · Tennis, Badminton, Racquetball, Golf · Track, Cross Country, Gymnastics, Cheer, Martial Arts, Wrestling, Weightlifting, General Fitness | Not designed yet. These use the plain gauge fill (200 ms) until they are |

  The ball and the fill share one coordinate system (both measured from the tile's top), so the ball always sits on the surface.
- **Exits:** Continue turns the page.

## 4. About you

- **Enters:** page turn.
- **Variations (decide from the prototype):**
  - **Player card:** a sports trading card sits in the top half, with the sport icon, AGE GROUP — and EXPERIENCE —. Below it is one labeled question at a time. The age answer stamps onto the card, then the choices slide over to the years question. The second answer completes the card.
  - **Two pages:** age group and years training become separate pages. Each has three huge full-width choices, like broadcast lower-thirds. One question per page, matching the Stories reference.
- **Exits:** the last answer leads into the reveal. There's no Continue button. A beat after the second answer, the reveal starts.

## 5. Reveal

A two-part story, **Category** then **Plan**, with a thin two-segment bar at the top (each segment has a 44 pt tap area).

- **Category (holds 3 s; a tap skips it, and it can always be revisited):**
  - The four category tiles come up in a 2×2 grid. Each holds a faceless silhouette athlete in uniform, two women and two men, drawn in code: **Endurance** drives, plants and cuts back the other way; **Power** loads, jumps and lands; **Rotation** coils, leads with the back hip, then swings the bat through; **Strength** drives two steps into a sled. Labels sit in a clear strip at the bottom of each tile.
  - The athlete's own tile lights in its color and plays its move once; the other three hold a still pose, dimmed.
  - "BASKETBALL TRAINS FOR" sits above, and the category name stamps in: "POWER", with its one line under it.
  - "Tap to see your plan" sits at the bottom.
- **Handoff (continuous):** the lit tile opens into the plan's top band with a clip, not a stretch. Its name stays visible until the band's own text takes over. The other tiles fall away.
- **Plan builds in order:**
  1. The band: a **POWER ›** chip, "BASKETBALL PLAN", and the countdown "FIRST GAME SUN, FEB 7 · 12 WEEKS". The sport icon plays a short action (0.8 s) and holds its pose.
  2. The phase bar draws one phase at a time, in plain English with the acronym small: **Build the base** (GPP), **Train for your sport** (SPP), **Sharpen for the season** (SSP). One caption holds while it draws: "Build the base. General fitness and how you move." Tapping a phase changes the caption:
     - SPP: "Training shifts to jumping, landing and stopping fast for basketball." (the focus line comes from the category)
     - SSP: "Less volume, the same speed and power, and recovery timed so you're fresh for your first game."
  3. **Your week:** a strip of the seven days with each training day's workout (Lower, Upper, Power, …, in the program's day order). Each day is tappable, and the line under the strip follows the selected day: "Day 1 · Tomorrow · Lower Body A · About 28 min" to start, "Day 2 · Wed · Upper Body A · About 28 min", or "Sat · Rest day". Minutes come from the real week 1 templates for the athlete's category and level.
  4. The payoff, set big: "48 SESSIONS OVER 12 WEEKS".
  5. **Save my plan**.
- **Going back:** tapping the **POWER ›** chip or the first story segment returns to the category, already complete, with "Tap to go back to your plan". A tap there returns to the finished plan.

## 6. Save

- **Shows:** the account sheet, as built: email, password, then the code.
- **Exits:** the sheet closes, and the app lands on the Program tab.

## 7. Program tab, first visit

- **Enters:** the sheet slides away and Program crossfades in. Its phase bar sits at exactly the same position and size as the reveal's, so it appears to stay still while the page changes around it.
- **Shows:** the season as GPP, SPP and SSP with weeks, and today marked. An **Up next** card for Day 1 with its day ("Tomorrow"). The card's edge pulses once.
- **Does not:** start the workout or open the warm-up. The athlete taps Day 1 when they're ready.

## Sign-in

- The "Welcome back" screen shows the Wander Fit wordmark instead of the lightning bolt. Until there's a final logo, it uses a text wordmark in Bebas Neue.
