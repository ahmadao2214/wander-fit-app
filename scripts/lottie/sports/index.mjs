// Every sport's generator. Shared by the build script and its drift test.

import soccer from './soccer.mjs'
import * as balls from './balls.mjs'
import * as ovals from './ovals.mjs'
import * as objects from './objects.mjs'

// Keyed by getSportSlug(name) from lib/intakeUI.ts.
export const SPORTS = {
  soccer,
  basketball: balls.basketball,
  volleyball: balls.volleyball,
  tennis: balls.tennis,
  baseball: balls.baseball,
  softball: balls.softball,
  cricket: balls.cricket,
  racquetball: balls.racquetball,
  lacrosse: balls.lacrosse,
  'field-hockey': balls.fieldHockey,
  football: ovals.football,
  rugby: ovals.rugby,
  badminton: ovals.badminton,
  'cross-country': objects.crossCountry,
  'track-distance': objects.trackDistance,
  'track-sprints-jumps': objects.trackSprints,
  gymnastics: objects.gymnastics,
  cheerleading: objects.cheerleading,
  diving: objects.diving,
  wrestling: objects.wrestling,
  'martial-arts': objects.martialArts,
  swimming: objects.swimming,
  'ice-hockey': objects.iceHockey,
  weightlifting: objects.weightlifting,
  'general-fitness': objects.generalFitness,
  golf: objects.golf,
  'ultimate-frisbee': objects.ultimateFrisbee,
}
