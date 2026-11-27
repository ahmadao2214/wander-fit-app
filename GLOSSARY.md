# Wander Fit

Training for athletes preparing for a season. An athlete answers intake, gets a program, and trains through three phases toward the season.

## Language

### People and first use

**Athlete**:
The person the product is for, training toward their own season. The product has no trainer or coach role.
_Avoid_: client, user, trainee

**First Run**:
Everything from an athlete's first launch until they start their first workout. Starting means finishing the warm-up or logging a first set.
_Avoid_: onboarding, setup, tutorial

**Intake**:
The questions inside the First Run whose answers build the athlete's program.
_Avoid_: quiz, survey, questionnaire, onboarding

### Phases

**Phase**:
One of the three stretches of a program, in order: GPP, then SPP, then SSP.
_Avoid_: block, stage

**GPP**:
General Physical Preparedness. The first phase, building general fitness and movement quality.
_Avoid_: General Physical Preparation, foundation phase

**SPP**:
Specific Physical Preparedness. The second phase, shifting training toward the demands of the athlete's sport.
_Avoid_: Specific Preparation, Specific Preparation Phase

**SSP**:
Sport-Specific Preparedness. The third phase, sharpening the athlete for the season itself.
_Avoid_: Sport-Specific Preparation, peak phase

### Chat

**Program**:
The assignment intake produces for an athlete: category, skill, phase, and the prescribed days. A chat calls actions on it and leaves that assignment in place.
_Avoid_: routine, plan, when those words mean a workout the chat authored

**Day**:
One prescribed workout on the athlete's calendar. The first change a chat may make is inside a day the app already shows.
_Avoid_: exercise library, movement bank

**Hands**:
The named actions a chat can call on the athlete's own program. The first connection is the one the athlete uses from Claude on the phone.

**Acceptance**:
The athlete's yes to a day as the chat showed it. The day changes only after that yes. A yes does not apply if the day changed after the chat read it.
_Avoid_: save, preview

**Unlocked phase**:
A phase the athlete can already open. GPP is unlocked from the start. SPP and SSP unlock in order. The chat can read and change days only in an unlocked phase.

**Intake slice**:
The slice after the first connection. The chat submits answers the athlete stated, and the app recomputes the program.
_Avoid_: the chat assigning a phase

**Athlete-added movement**:
A library movement placed on a day by the athlete through a chat, in a later slice. It stays distinct from a movement the program prescribed.
_Avoid_: custom exercise

### Feedback

**Feedback**:
Anything an athlete sends from inside the app: a rating, a bug report or a feature request.
_Avoid_: ticket, support request

**Feature Request**:
The athlete's own words for something they want. After triage it is a Product Enhancement of its own, joins one already tracked, or is dropped.
_Avoid_: idea, suggestion

**Triage**:
Deciding what a piece of feedback is and what happens to it. It ends in a new issue, a merge into an existing issue, or a drop.
_Avoid_: review, grooming

### Kinds of work

**Bug**:
The app does something other than what it was built to do.
_Avoid_: defect, issue (an issue is where any kind of work is tracked)

**Product Enhancement**:
A change an athlete can see or feel.
_Avoid_: feature, enhancement on its own

**Platform Enhancement**:
A change no athlete sees: CI, tests, builds, releases, tooling, infrastructure.
_Avoid_: chore, tech debt, enhancement on its own
