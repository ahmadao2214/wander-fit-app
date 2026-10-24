# Wander-Fit

Wander-Fit gives athletes a periodized training program for their sport and guides them through each workout.

## People

**Athlete**:
A person who trains with a Wander-Fit program. The code's `client` role is a legacy name for the same person.
_Avoid_: Client, user (when the training person is meant)

**Trainer**:
A coach who assigns workouts to athletes. A legacy concept that the current product does not use.
_Avoid_: Coach

## Getting started

**Intake**:
The questionnaire an athlete answers about their sport, age group, training experience, training days, season timeline and maxes, which decides their program.
_Avoid_: Questionnaire, survey

**Onboarding**:
The education screens, interleaved with intake, that explain how the program works.
_Avoid_: Tutorial

**Commitment**:
The hold-to-confirm step that ends intake and onboarding and creates the athlete's program.

**Activation**:
The whole journey from sign-up to a new athlete's first view of Today with a workout ready.
_Avoid_: Signup flow (covers only the account step)

## Training

**Program**:
An athlete's personal schedule of workouts through the three phases, placed on their chosen training days.

**Phase**:
One block of a program: GPP (General Physical Preparedness), SPP (Specific Physical Preparedness), or SSP (Sport-Specific Preparedness), in that order.

**Workout**:
One day's prescribed exercises, sets and reps within a phase.
_Avoid_: Template (in user-facing language)

**Session**:
One attempt by an athlete at a workout, from start to completion or abandonment.
_Avoid_: Workout log

**Max**:
An athlete's one-rep max on a core lift (back squat, bench press, trap bar deadlift), used to scale prescribed weights.
_Avoid_: 1RM in user-facing language; chest press (means bench press)

**Reassessment**:
The check-in at the end of a phase, where the athlete rates difficulty, updates maxes, and unlocks the next phase.
_Avoid_: Assessment, check-up
