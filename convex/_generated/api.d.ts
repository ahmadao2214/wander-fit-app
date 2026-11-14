/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as authHelpers from "../authHelpers.js";
import type * as debug from "../debug.js";
import type * as e2e from "../e2e.js";
import type * as exercises from "../exercises.js";
import type * as generateTemplates from "../generateTemplates.js";
import type * as gppWorkoutSessions from "../gppWorkoutSessions.js";
import type * as intensityScaling from "../intensityScaling.js";
import type * as migrations_migrateAgeGroups from "../migrations/migrateAgeGroups.js";
import type * as migrations_migrateTemplates from "../migrations/migrateTemplates.js";
import type * as migrations from "../migrations.js";
import type * as onboarding from "../onboarding.js";
import type * as programTemplates from "../programTemplates.js";
import type * as scheduleOverrides from "../scheduleOverrides.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as sports from "../sports.js";
import type * as userMaxes from "../userMaxes.js";
import type * as userPrograms from "../userPrograms.js";
import type * as users from "../users.js";
import type * as warmupSequences from "../warmupSequences.js";
import type * as weekMapping from "../weekMapping.js";
import type * as workoutCalendar from "../workoutCalendar.js";
import type * as workoutSessions from "../workoutSessions.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  authHelpers: typeof authHelpers;
  debug: typeof debug;
  e2e: typeof e2e;
  exercises: typeof exercises;
  generateTemplates: typeof generateTemplates;
  gppWorkoutSessions: typeof gppWorkoutSessions;
  intensityScaling: typeof intensityScaling;
  "migrations/migrateAgeGroups": typeof migrations_migrateAgeGroups;
  "migrations/migrateTemplates": typeof migrations_migrateTemplates;
  migrations: typeof migrations;
  onboarding: typeof onboarding;
  programTemplates: typeof programTemplates;
  scheduleOverrides: typeof scheduleOverrides;
  seed: typeof seed;
  seedData: typeof seedData;
  sports: typeof sports;
  userMaxes: typeof userMaxes;
  userPrograms: typeof userPrograms;
  users: typeof users;
  warmupSequences: typeof warmupSequences;
  weekMapping: typeof weekMapping;
  workoutCalendar: typeof workoutCalendar;
  workoutSessions: typeof workoutSessions;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
