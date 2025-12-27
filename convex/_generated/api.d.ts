/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as exercises from "../exercises.js";
import type * as gppWorkoutSessions from "../gppWorkoutSessions.js";
import type * as invitations from "../invitations.js";
import type * as programTemplates from "../programTemplates.js";
import type * as sampleData from "../sampleData.js";
import type * as scheduleOverrides from "../scheduleOverrides.js";
import type * as seed from "../seed.js";
import type * as seedData from "../seedData.js";
import type * as sports from "../sports.js";
import type * as userPrograms from "../userPrograms.js";
import type * as users from "../users.js";
import type * as workoutSessions from "../workoutSessions.js";
import type * as workouts from "../workouts.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  exercises: typeof exercises;
  gppWorkoutSessions: typeof gppWorkoutSessions;
  invitations: typeof invitations;
  programTemplates: typeof programTemplates;
  sampleData: typeof sampleData;
  scheduleOverrides: typeof scheduleOverrides;
  seed: typeof seed;
  seedData: typeof seedData;
  sports: typeof sports;
  userPrograms: typeof userPrograms;
  users: typeof users;
  workoutSessions: typeof workoutSessions;
  workouts: typeof workouts;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
